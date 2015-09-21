(function (ns) {

    var common = require("../../base/common.js"),
        Shade = require("../../interfaces.js"),
        Base = require("../../base/index.js"),
        estraverse = require('estraverse');

    // var codegen = require('escodegen');

    var Syntax = common.Syntax,
        TYPES = Shade.TYPES,
        ANNO = common.ANNO;


    /**
     * Transform AST: Eliminate branches due to static conditions
     * and performs constant folding
     * @param {Object} ast
     * @returns Object
     */
    var transform = ns.transform = function (ast, opt) {
        var transformer = new Transformer(opt);
        return transformer.transform(ast);
    }

    var Transformer = function(opt) {
        opt = opt || {};

        this.foldConstants = opt.foldConstants !== undefined ? opt.foldConstants : true;

        this.controller = new estraverse.Controller();
    };

    Transformer.prototype = {
        transform: function (ast) {
            var that = this;
            return this.controller.replace(ast, {
                enter: function (node, parent) {
                    var typeInfo = ANNO(node);
                    if (!typeInfo.isValid()) {
                        return;
                    }

                    switch (node.type) {
                        case Syntax.IfStatement:
                            return that.handleIfStatement(node);
                        case Syntax.ConditionalExpression:
                            return that.handleConditionalExpression(node);
                        case Syntax.LogicalExpression:
                            return that.handleLogicalExpression(node);
                        case Syntax.AssignmentExpression:
                            return that.handleAssignmentExpression(node);
                        case Syntax.VariableDeclarator:
                            return that.handleVariableDeclarator(node);
                        case Syntax.NewExpression:
                            //case Syntax.CallExpression:
                            return that.handleNewExpression(node);
                        case Syntax.VariableDeclaration:
                            return that.handleVariableDeclaration(node);

                    }

                    if(that.foldConstants && isExpression(node.type, parent.type)) {
                        return that.foldConstantExpression(node);
                    }
                }
            });
        },


        handleIfStatement: function (node) {
            var test = ANNO(node.test);

            if (test.hasConstantValue() || test.canObject()) {
                this.controller.skip();
                var staticValue = test.getStaticTruthValue();
                if (staticValue === true) {
                    return transform(node.consequent);
                }
                if (staticValue === false) {
                    if (node.alternate) {
                        return this.transform(node.alternate);
                    }
                    return {
                        type: Syntax.EmptyStatement
                    }
                }
            }
        },


        handleConditionalExpression: function (node) {
            var test = ANNO(node.test);

            if (test.hasConstantValue() || test.canObject()) {
                this.controller.skip();
                var staticValue = test.getStaticTruthValue();
                if (staticValue === true) {
                    return this.transform(node.consequent);
                } else {
                    return this.transform(node.alternate);
                }
            }
        },

        handleLogicalExpression: function (node) {
            var left = ANNO(node.left);
            var right = ANNO(node.right);
            var leftBool = left.getStaticTruthValue();
            var rightBool = right.getStaticTruthValue();

            if (node.operator === "||") {
                if (leftBool === false) {
                    return node.right;
                }
                if (leftBool === true) {
                    return node.left;
                }
                // Left is dynamic, let's check right
                if (rightBool === false) {
                    return node.left;
                }
            } else if (node.operator === "&&") {
                if (leftBool === false) {
                    return node.left;
                }
                if (leftBool === true) {
                    return node.right;
                }
                // Left is dynamic, let's check right
                if (rightBool === true) {
                    // Now the result type is always the one of the left value
                    return node.left;
                }
                if (rightBool === false) {
                    // Now the result must be false
                    return {
                        type: Syntax.Literal,
                        value: "false",
                        extra: { type: "boolean"}
                    };
                }
            }
        },

        handleAssignmentExpression: function (node) {
            node.right = this.foldConstantExpression(node.right);
            return node;
        },
        handleNewExpression: function (node) {
            var args = node.arguments, newArgs = [];
            args.forEach(function (arg) {
                var typeInfo = ANNO(arg);
                if (isSimpleStatic(typeInfo)) {
                    newArgs.push(generateLiteralFromTypeInfo(typeInfo))
                } else {
                    newArgs.push(arg);
                }
            });
            node.arguments = newArgs;
            return node;
        },

        handleVariableDeclaration: function (node) {
            var declarations = node.declarations, newDeclarations = [], that = this;
            declarations.forEach(function (declaration) {
                var typeInfo = ANNO(declaration);
                if (!typeInfo.isUndefined()) {
                    newDeclarations.push(declaration);
                }
            });
            if (!newDeclarations.length) {
                return {
                    type: Syntax.EmptyStatement
                }
            }
            node.declarations = newDeclarations;
            return node;
        },
        handleVariableDeclarator: function (node) {
            if (node.init) {
                node.init = this.foldConstantExpression(node.init);
                return node;
            }
        },
        foldConstantExpression: function (node) {
            var anno = ANNO(node);
            if (this.foldConstants) {
                if (isSimpleStatic(anno)) {
                    return generateLiteralFromTypeInfo(anno);
                } else if (isStaticObject(anno)) {
                    return generateConstructorFromTypeInfo(anno);
                }
            }
            return node;
        }


    };

    function isSimpleStatic(typeInfo) {
        return typeInfo.hasConstantValue() && !(typeInfo.isObject() || typeInfo.isNullOrUndefined());
    }

     function isStaticObject(typeInfo) {
        return typeInfo.hasConstantValue() && typeInfo.isVector();
    }

    var c_expressions = [Syntax.BinaryExpression, Syntax.UnaryExpression, Syntax.MemberExpression];
    var c_parentLiteralExpressions = [Syntax.BinaryExpression, Syntax.ReturnStatement, Syntax.CallExpression];


    function isExpression(type, parentType) {
        if(type === Syntax.Identifier) {
            return c_parentLiteralExpressions.indexOf(parentType) !== -1;
        }
        return c_expressions.indexOf(type) !== -1;
    };


    function generateConstructorFromTypeInfo(typeInfo) {
        var value = typeInfo.getConstantValue(), size, name, arguments = [];
        switch(typeInfo.getKind()) {
            case Shade.OBJECT_KINDS.FLOAT2: size = 2; name = "Vec2"; break;
            case Shade.OBJECT_KINDS.FLOAT3: size = 3; name = "Vec3"; break;
            case Shade.OBJECT_KINDS.FLOAT4: size = 4; name = "Vec4"; break;
            default:
                throw new Error("Internal error in static transformation. Unknown kind: " + typeInfo.getKind());
        }

        var same = true;
        for(var i = 0; (i < size-1) && same; ++i) {
            same = same && value[i] == value[i+1];
        }

        size = same ? 1 : size;

        for(i = 0; i < size; ++i) {
            arguments.push(generateFloatLiteralFromValue(value[i]));
        }


        var result = {
            type: Syntax.NewExpression,
            callee: {
                type: Syntax.Identifier,
                name: name
            },
            arguments: arguments
        }
        ANNO(result).copy(typeInfo);
        return result;
    }

    function generateFloatLiteralFromValue(value) {
        var needsSign = value < 0;

        var literal = { type: Syntax.Literal, value: needsSign ? -value : value };
        ANNO(literal).setType(Shade.TYPES.NUMBER);

        if (!needsSign)
            return literal;

        var expression = {
                type: Syntax.UnaryExpression,
                operator: "-",
                argument: literal
        }
        ANNO(expression).setType(Shade.TYPES.NUMBER);
        return expression;
    }

    function generateLiteralFromTypeInfo(typeInfo) {
        var value = typeInfo.getConstantValue();
        var isNegative = value < 0;

        var result = {
            type: Syntax.Literal,
            value: isNegative ? -value : value
        };
		var ti = ANNO(result);
		ti.copyFrom(typeInfo);

        if(isNegative) {
            result.extra.constantValue = -value;
            result = {
                type: Syntax.UnaryExpression,
                operator: "-",
                argument: result
            }
            ti = ANNO(result);
			ti.copyFrom(typeInfo);
        }
        return result;
    }









}(exports));

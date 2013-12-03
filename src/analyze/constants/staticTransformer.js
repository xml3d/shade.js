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
                enter: function (node) {
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
                }
            });
        },


        handleIfStatement: function (node) {
            var test = ANNO(node.test);

            if (test.hasStaticValue() || test.canObject()) {
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

            if (test.hasStaticValue() || test.canObject()) {
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
            var declarations = node.declarations, newDeclarations = [];
            declarations.forEach(function (declaration) {
                var typeInfo = ANNO(declaration);
                if (!typeInfo.isUndefined()) {
                    newDeclarations.push(declaration);
                }
            });
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
            if (this.foldConstants && isSimpleStatic(anno)) {
                return generateLiteralFromTypeInfo(anno);
            }
            return node;
        }


    };

    function isSimpleStatic(typeInfo) {
        return typeInfo.hasStaticValue() && !(typeInfo.isObject() || typeInfo.isNullOrUndefined());
    }


    function generateLiteralFromTypeInfo(typeInfo) {
        var result = {
            type: Syntax.Literal,
            value: typeInfo.getStaticValue(),
            extra: {}
        }
        Base.extend(result.extra, typeInfo.getExtra());
        return result;
    }










}(exports));

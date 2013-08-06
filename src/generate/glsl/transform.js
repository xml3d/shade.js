(function (ns) {

    var Base = require("../../base/index.js"),
        Annotation = require("../../base/annotation.js").Annotation,
        FunctionAnnotation = require("../../base/annotation.js").FunctionAnnotation,
        Context = require("../../analyze/context.js").Context,
        Types = require("./../../interfaces.js").TYPES;

    var ObjectRegistry = {};

    require("./registry/math.js").register(ObjectRegistry);

    var walk = require('estraverse');
    var Syntax = walk.Syntax;


    /**
     * Transforms the JS AST to an AST representation convenient
     * for code generation
     * @constructor
     */
    var GLASTTransformer = function (mainId) {
        this.mainId = mainId;
    };

    Base.extend(GLASTTransformer.prototype, {
        transformAAST: function (program) {
            this.root = program;
            var context = new Context(program, null, {name: "global"}),
                contextStack = [context],
                mainId = this.mainId,
                inMain = mainId == context.str();

            walk.replace(program, {

                enter: function (node, parent) {
                    //console.log("Enter:", node.type);
                    switch (node.type) {
                        case Syntax.MemberExpression:
                            return handleMemberExpression(node, parent, program);
                        case Syntax.BinaryExpression:
                            return handleBinaryExpression(node, parent);
                        case Syntax.IfStatement:
                            return handleIfStatement(node);
                        case Syntax.LogicalExpression:
                            return handleLogicalExpression(node, parent);
                        case Syntax.FunctionDeclaration:
                            var parentContext = contextStack[contextStack.length - 1];
                            parentContext.declareVariable(node.id.name);
                            context = new Context(node, parentContext, {name: node.id.name });
                            contextStack.push(context);
                            inMain = mainId == context.str()
                            break;
                        case Syntax.ReturnStatement:
                            if(inMain) {
                                return handleReturnInMain(node);
                            }
                            break;
                    }
                },

                leave: function(node, parent) {
                    switch(node.type) {
                        case Syntax.FunctionDeclaration:
                            context = contextStack.pop();
                            inMain = context.str() == mainId;
                            if (inMain)
                                return handleMainFunction(node, parent, context);
                    }
                }
            });
            return program;
        }
    });


    var handleReturnInMain = function(node) {
        if (node.argument) {
            return {
                type: Syntax.AssignmentExpression,
                operator: "=",
                left: {
                    type: Syntax.Identifier,
                    name: "gl_FragColor"
                },
                right: node.argument
            }
        } else {
            return {
                type: Syntax.ExpressionStatement,
                expression : {
                    type: Syntax.Identifier,
                    name: "discard"
                }
            }
        }
    };

    var handleMainFunction = function(node, parent, context) {
        var anno = new FunctionAnnotation(node);
        anno.setReturnInfo({ type: Types.UNDEFINED });
        // Rename to 'main'
        node.id.name = "main";
    }


    var handleMemberExpression = function (memberExpression, parent, root) {
        // console.log("Member:", memberExpression.object);
        var object = memberExpression.object,
            property = memberExpression.property;

        if (object.name in ObjectRegistry) {
            var objectEntry = ObjectRegistry[object.name];
            if (property.name in objectEntry) {
                var propertyHandler = objectEntry[property.name];
                if (typeof propertyHandler == "function") {
                    return propertyHandler(memberExpression, parent, cb);
                }
            }
        }
        var exp = new Annotation(memberExpression);
        if(exp.isGlobal()) {
            var decl = {
                type: Syntax.VariableDeclaration,
                declarations: [
                    {
                        type: Syntax.VariableDeclarator,
                        id: { type: Syntax.Literal, name: property.name},
                        init: null
                    }
                ],
                kind: "var"
            };
            var declAnnotation =  new Annotation(decl);
            declAnnotation.copy(exp);
            root.body.unshift(decl);
            console.log(root.body[0]);

        }

    };

    var handleBinaryExpression = function (binaryExpression, parent, cb) {
        if (binaryExpression.operator = "%") {
            return handleModulo(binaryExpression);
        }
    }

    var handleModulo = function (binaryExpression) {
        return {
            type: Syntax.CallExpression,
            callee: {
                type: Syntax.Identifier,
                name: "mod"
            },
            arguments: [
                binaryExpression.left,
                binaryExpression.right // TODO: Needs to be number type
            ]
        }
    }


    var handleIfStatement = function (node) {
        var consequent = new Annotation(node.consequent);
        var alternate = node.alternate ? new Annotation(node.alternate) : null;
        if (consequent.canEliminate()) {
            if (alternate) {
                return node.alternate;
            }
            return {
                type: Syntax.EmptyStatement
            }
        } else if (alternate && alternate.canEliminate()) {
            return node.consequent;
        }
    };

    var handleLogicalExpression = function (node) {
        var left = new Annotation(node.left);
        var right = new Annotation(node.right);
        if (left.canEliminate())
            return node.right;
        if (right.canEliminate())
            return node.left;
    }

    // Exports
    ns.GLASTTransformer = GLASTTransformer;


}(exports));

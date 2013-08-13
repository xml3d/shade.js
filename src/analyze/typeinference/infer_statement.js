(function (ns) {

    var walk = require('estraverse'),
        enterExpression = require('./infer_expression.js').enterExpression,
        exitExpression = require('./infer_expression.js').exitExpression,
        Syntax = require('estraverse').Syntax,
        TYPES = require("../../interfaces.js").TYPES,
        Annotation = require("./../../base/annotation.js").Annotation,
        FunctionAnnotation = require("./../../base/annotation.js").FunctionAnnotation;

    var log = function(str) {};
    //var log = function() { console.log.apply(console, arguments); };

    var enterHandler = {
        ForStatement: function(node, ctx, root) {
            var ctx = root.createContext(node, ctx);
            root.pushContext(ctx);

            root.traverse(node.init);
            root.traverse(node.test);

            var test = new Annotation(node.test);
            if (test.hasStaticValue()) { // Great! We can evaluate it!
                // TODO
            }

            root.traverse(node.update);
            root.traverse(node.body);
            root.popContext();
            return walk.VisitorOption.Skip;
        },

        IfStatement: (function() {

            var c_evaluate = function(exp) {
                return !!exp;
            }

            return function(node, ctx, root) {
                root.traverse(node.test);
                var test = new Annotation(node.test);
                if (test.hasStaticValue()) { // Great! We can evaluate it!
                    //console.log("Static value in if test!");
                    var testResult = c_evaluate(test.getStaticValue());
                    if(!testResult) {
                        if (node.alternate)
                            root.traverse(node.alternate);

                        var consequent = new Annotation(node.consequent);
                        consequent.eliminate();
                    } else {
                        root.traverse(node.consequent);
                        if(node.alternate) {
                            var alternate = new Annotation(node.alternate);
                            alternate.eliminate();
                        }
                    }
                    return walk.VisitorOption.Skip;
                }
            }
        }()),

        VariableDeclaration: function(node, ctx) {
            ctx.inDeclaration = true;
        },


        /**
         * @param {Object} node
         * @param {Context} parentContext
         * @param {TypeInference} root
         */
        FunctionDeclaration: function(node, parentContext, root) {
            var result = new FunctionAnnotation(node);

            if (node.id.type != Syntax.Identifier) {
                throw new Error("Dynamic variable names are not yet supported");
            }
            var functionName = node.id.name;
            parentContext.declareVariable(functionName);
            parentContext.updateExpression(functionName, result);

            var functionContext = root.createContext(node, parentContext, { name : functionName });
            functionContext.declareParameters(node.params);
            root.pushContext(functionContext);
            if(functionContext.str() != root.entryPoint) {
                return walk.VisitorOption.Skip;
            } else {
                result.setUsed(true);
            }
        }
    }

    var exitHandler = {
        /**
         * @param node
         * @param {Context} ctx
         * @param {TypeInference} root
         */
        FunctionDeclaration: function(node, ctx, root) {
            var result = new FunctionAnnotation(node);
            var returnInfo = ctx.getReturnInfo();
            result.setReturnInfo(returnInfo || { type: TYPES.UNDEFINED });
            root.popContext();
        },
        VariableDeclaration: function(node, ctx) {
            ctx.inDeclaration = false;
        },
        VariableDeclarator: function(node, ctx) {
            var result = new Annotation(node);

            if (node.id.type != Syntax.Identifier) {
                throw new Error("Dynamic variable names are not yet supported");
            }
            var variableName = node.id.name;
            ctx.declareVariable(variableName);

            if (node.init) {
                var init = ctx.createTypeInfo(node.init);
                result.copy(init);
                ctx.updateExpression(variableName, init);
            } else {
                result.setType(TYPES.UNDEFINED);
            }
            // TODO: result.setType(init.getType());
        },
        ReturnStatement: function(node, parent, ctx) {
            var result = new Annotation(node),
                argument = node.argument ? ctx.createTypeInfo(node.argument) : null;

            if (argument) {
                result.copy(argument);
            } else {
                result.setType(TYPES.UNDEFINED);
            }
            ctx.updateReturnInfo(result);
        }

    }




    var enterStatement = function (node, parent, ctx) {
        switch (node.type) {
            case Syntax.ForStatement:
                return enterHandler.ForStatement(node, ctx, this);
            case Syntax.IfStatement:
                return enterHandler.IfStatement(node, ctx, this);
            case Syntax.VariableDeclaration:
                return enterHandler.VariableDeclaration(node, ctx);
            case Syntax.FunctionDeclaration:
                return enterHandler.FunctionDeclaration(node, ctx, this);

        }
        return;


    };

    var exitStatement = function (node, parent, ctx) {

        switch (node.type) {
            case Syntax.ExpressionStatement:
                var result = new Annotation(node),
                    expression = new Annotation(node.expression);

                result.copy(expression);

                break;
            case Syntax.BlockStatement:
                log(node.type + " is not handle yet.");
                break;
            case Syntax.BreakStatement:
                log(node.type + " is not handle yet.");
                break;
            case Syntax.CatchClause:
                log(node.type + " is not handle yet.");
                break;
            case Syntax.ContinueStatement:
                log(node.type + " is not handle yet.");
                break;
            case Syntax.DirectiveStatement:
                log(node.type + " is not handle yet.");
                break;
            case Syntax.DoWhileStatement:
                log(node.type + " is not handle yet.");
                break;
            case Syntax.DebuggerStatement:
                log(node.type + " is not handle yet.");
                break;
            case Syntax.EmptyStatement:
                log(node.type + " is not handle yet.");
                break;
            case Syntax.ForStatement:
                log(node.type + " is not handle yet.");
                break;
            case Syntax.ForInStatement:
                log(node.type + " is not handle yet.");
                break;
            case Syntax.FunctionDeclaration:
                return exitHandler.FunctionDeclaration(node, ctx, this);
                break;
            case Syntax.IfStatement:
                break;
            case Syntax.LabeledStatement:
                log(node.type + " is not handle yet.");
                break;
            case Syntax.Program:
                break;
            case Syntax.ReturnStatement:
                return exitHandler.ReturnStatement(node, parent, ctx);
                break;
            case Syntax.SwitchStatement:
                log(node.type + " is not handle yet.");
                break;
            case Syntax.SwitchCase:
                log(node.type + " is not handle yet.");
                break;
            case Syntax.ThrowStatement:
                log(node.type + " is not handle yet.");
                break;
            case Syntax.TryStatement:
                log(node.type + " is not handle yet.");
                break;
            case Syntax.VariableDeclaration:
                return exitHandler.VariableDeclaration(node, ctx);
            case Syntax.VariableDeclarator:
                exitHandler.VariableDeclarator(node, ctx);
                break;
            case Syntax.WhileStatement:
                log(node.type + " is not handle yet.");
                break;
            case Syntax.WithStatement:
                log(node.type + " is not handle yet.");
                break;
            default:
                throw new Error('Unknown node type: ' + node.type);
        }

    };

    ns.enterStatement = enterStatement;
    ns.exitStatement = exitStatement;
}(exports));

(function (ns) {

    var walk = require('estraverse'),
        enterExpression = require('./infer_expression.js').enterExpression,
        exitExpression = require('./infer_expression.js').exitExpression,
        Syntax = require('estraverse').Syntax,
        TYPES = require("../../interfaces.js").TYPES,
        Context = require("./../context.js").Context,
        Annotation = require("./../../base/annotation.js").Annotation,
        FunctionAnnotation = require("./../../base/annotation.js").FunctionAnnotation;

    var enterHandler = {
        IfStatement: (function() {

            var c_evaluate = function(exp) {
                return !!exp;
            }

            return function(node, ctx) {
                walk.traverse(node.test, {
                    enter: function(node, parent) { enterExpression(node, parent, ctx); },
                    leave: function(node, parent) { exitExpression(node, parent, ctx); }
                });
                var test = new Annotation(node.test);
                if (test.hasStaticValue()) { // Great! We can evaluate it!
                    //console.log("Static value in if test!");
                    var testResult = c_evaluate(test.getStaticValue());
                    if(!testResult) {
                        var consequent = new Annotation(node.consequent);
                        consequent.eliminate();
                    } else if(node.alternate) {
                        var alternate = new Annotation(node.alternate);
                        alternate.eliminate();
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

            var functionContext = new Context(node, parentContext, { name : functionName });
            functionContext.declareParameters(node.params);


            root.pushContext(functionContext);
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
                var init = Annotation.createForContext(node.init, ctx);
                result.copy(init);
                ctx.updateExpression(variableName, init);
            } else {
                result.setType(TYPES.UNDEFINED);
            }
            // TODO: result.setType(init.getType());
        },
        ReturnStatement: function(node, parent, ctx) {
            var result = new Annotation(node),
                argument = node.argument ? Annotation.createForContext(node.argument, ctx) : null;

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
            case Syntax.IfStatement:
                return enterHandler.IfStatement(node, ctx);
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
                console.log(node.type + " is not handle yet.");
                break;
            case Syntax.BreakStatement:
                console.log(node.type + " is not handle yet.");
                break;
            case Syntax.CatchClause:
                console.log(node.type + " is not handle yet.");
                break;
            case Syntax.ContinueStatement:
                console.log(node.type + " is not handle yet.");
                break;
            case Syntax.DirectiveStatement:
                console.log(node.type + " is not handle yet.");
                break;
            case Syntax.DoWhileStatement:
                console.log(node.type + " is not handle yet.");
                break;
            case Syntax.DebuggerStatement:
                console.log(node.type + " is not handle yet.");
                break;
            case Syntax.EmptyStatement:
                console.log(node.type + " is not handle yet.");
                break;
            case Syntax.ForStatement:
                console.log(node.type + " is not handle yet.");
                break;
            case Syntax.ForInStatement:
                console.log(node.type + " is not handle yet.");
                break;
            case Syntax.FunctionDeclaration:
                return exitHandler.FunctionDeclaration(node, ctx, this);
                break;
            case Syntax.IfStatement:
                break;
            case Syntax.LabeledStatement:
                console.log(node.type + " is not handle yet.");
                break;
            case Syntax.Program:
                break;
            case Syntax.ReturnStatement:
                return exitHandler.ReturnStatement(node, parent, ctx);
                break;
            case Syntax.SwitchStatement:
                console.log(node.type + " is not handle yet.");
                break;
            case Syntax.SwitchCase:
                console.log(node.type + " is not handle yet.");
                break;
            case Syntax.ThrowStatement:
                console.log(node.type + " is not handle yet.");
                break;
            case Syntax.TryStatement:
                console.log(node.type + " is not handle yet.");
                break;
            case Syntax.VariableDeclaration:
                return exitHandler.VariableDeclaration(node, ctx);
            case Syntax.VariableDeclarator:
                exitHandler.VariableDeclarator(node, ctx);
                break;
            case Syntax.WhileStatement:
                console.log(node.type + " is not handle yet.");
                break;
            case Syntax.WithStatement:
                console.log(node.type + " is not handle yet.");
                break;
            default:
                throw new Error('Unknown node type: ' + node.type);
        }

    };

    ns.enterStatement = enterStatement;
    ns.exitStatement = exitStatement;
}(exports));

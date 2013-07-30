(function (ns) {

    var walk = require('estraverse'),
        enterExpression = require('./infer_expression.js').enterExpression,
        exitExpression = require('./infer_expression.js').exitExpression,
        Syntax = require('estraverse').Syntax,
        Shade = require("../../interfaces.js").Shade,
        Annotation = require("./../../base/annotation.js").Annotation;

    var TYPES = Shade.TYPES;

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
        }())
    }

    var exitHandler = {
        VariableDeclarator: function(node, ctx) {
            var result = node.annotation;

            if (node.id.type != Syntax.Identifier) {
                throw new Error("Dynamic variable names are not yet supported");
            }
            var variableName = node.id.name;
            ctx.declareVariable(variableName);

            if (node.init) {
                var init = node.init.annotation;
                result.copy(init);
                ctx.updateExpression(variableName, init);
            } else {
                result.setType(TYPES.UNDEFINED);
            }
            // TODO: result.setType(init.getType());
        }
    }




    var enterStatement = function (node, parent, ctx) {

        switch (node.type) {
            case Syntax.IfStatement:
                return enterHandler.IfStatement(node, ctx);

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
                console.log(node.type + " is not handle yet.");
                break;
            case Syntax.IfStatement:
                break;
            case Syntax.LabeledStatement:
                console.log(node.type + " is not handle yet.");
                break;
            case Syntax.Program:
                break;
            case Syntax.ReturnStatement:
                console.log(node.type + " is not handle yet.");
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
                break;
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

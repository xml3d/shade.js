(function (ns) {
    /**
     * Shade.js specific type inference that is also inferring
     * virtual types {@link Shade.TYPES }
     */

    var walk = require('estraverse'),
        enterExpression = require('./infer_expression.js').enterExpression,
        exitExpression = require('./infer_expression.js').exitExpression,
        enterStatement = require('./infer_statement.js').enterStatement,
        exitStatement = require('./infer_statement.js').exitStatement;

    var Syntax = walk.Syntax;


    var enterNode = function(node) {
        switchKind(node, enterStatement, enterExpression);
    }

    var exitNode = function(node) {
        switchKind(node, exitStatement, exitExpression);
    }

    var switchKind = function(node, statement, expression) {
        switch (node.type) {
            case Syntax.BlockStatement:
            case Syntax.BreakStatement:
            case Syntax.CatchClause:
            case Syntax.ContinueStatement:
            case Syntax.DirectiveStatement:
            case Syntax.DoWhileStatement:
            case Syntax.DebuggerStatement:
            case Syntax.EmptyStatement:
            case Syntax.ExpressionStatement:
            case Syntax.ForStatement:
            case Syntax.ForInStatement:
            case Syntax.FunctionDeclaration:
            case Syntax.IfStatement:
            case Syntax.LabeledStatement:
            case Syntax.Program:
            case Syntax.ReturnStatement:
            case Syntax.SwitchStatement:
            case Syntax.SwitchCase:
            case Syntax.ThrowStatement:
            case Syntax.TryStatement:
            case Syntax.VariableDeclaration:
            case Syntax.VariableDeclarator:
            case Syntax.WhileStatement:
            case Syntax.WithStatement:
                statement(node);
                break;

            case Syntax.AssignmentExpression:
            case Syntax.ArrayExpression:
            case Syntax.ArrayPattern:
            case Syntax.BinaryExpression:
            case Syntax.CallExpression:
            case Syntax.ConditionalExpression:
            case Syntax.FunctionExpression:
            case Syntax.Identifier:
            case Syntax.Literal:
            case Syntax.LogicalExpression:
            case Syntax.MemberExpression:
            case Syntax.NewExpression:
            case Syntax.ObjectExpression:
            case Syntax.ObjectPattern:
            case Syntax.Property:
            case Syntax.SequenceExpression:
            case Syntax.ThisExpression:
            case Syntax.UnaryExpression:
            case Syntax.UpdateExpression:
            case Syntax.YieldExpression:
                expression(node);
                break;

            default:
                throw new Error('Unknown node type: ' + node.type);
        }
    }


    var infer = function(ast) {
        walk.traverse(ast, {
            enter: enterNode,
            leave: exitNode
        });
        return ast;
    };



    ns.infer = infer;


}(exports));

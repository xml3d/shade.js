(function (ns) {
    /**
     * Shade.js specific type inference that is also inferring
     * virtual types {@link Shade.TYPES }
     */

    var walk = require('estraverse'),
        enterExpression = require('./infer_expression.js').enterExpression,
        exitExpression = require('./infer_expression.js').exitExpression,
        enterStatement = require('./infer_statement.js').enterStatement,
        exitStatement = require('./infer_statement.js').exitStatement,
        Context = require("./context.js").Context,
        MathObject = require("./registry/math.js"),
        ColorObject = require("./registry/color.js"),
        ShadeObject = require("./registry/shade.js"),
        Base = require("../../base/index.js").Base;


    var Syntax = walk.Syntax;





    var registerGlobalContext = function (program) {
        var ctx = new Context(program, null, {name: "global"});
        ctx.registerObject("Math", MathObject);
        ctx.registerObject("Color", ColorObject);
        ctx.registerObject("Shade", ShadeObject);
        return ctx;
    }

    var TypeInference = function (root) {
        this.root = root;
        this.context = [];
        this.context.push(registerGlobalContext(root));
    }

    Base.extend(TypeInference.prototype, {

        infer: function () {
            //variables && variables.env && (variables.env.global = true);

            walk.traverse(this.root, {
                enter: this.enterNode.bind(this),
                leave: this.exitNode.bind(this)
            });
            return this.root;
        },

        enterNode : function (node, parent) {
            var context = this.context[this.context.length-1];
            return this.switchKind(node, parent, context, enterStatement, enterExpression);
        },

        exitNode : function (node, parent) {
            var context = this.context[this.context.length-1];
            return this.switchKind(node, parent, context, exitStatement, exitExpression);
        },

        switchKind : function (node, parent, ctx, statement, expression) {
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
                return statement.call(this, node, parent, ctx);

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
                return expression.call(this, node, parent, ctx);

            default:
                throw new Error('Unknown node type: ' + node.type);
        }
    }
    });


    ns.infer = function (ast, variables) {
        var ti = new TypeInference(ast);
        return ti.infer();
    };


}(exports));

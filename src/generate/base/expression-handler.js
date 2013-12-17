(function (ns) {

    // Dependencies
    var common = require("../../base/common.js");
    var Shade = require("../../interfaces.js");

    // Shortcuts
    var Syntax = common.Syntax;

    function generateFloat(value) {
        if (isNaN(value))
            throw Error("Internal: Expression generated NaN!");
        var result = '' + value;
        if (result.indexOf(".") == -1 && result.indexOf("e") == -1) {
            result += ".0";
        }
        return result;
    }

    /**
     *
     * @param controller
     * @param {object?} options
     * @constructor
     */
    var ExpressionHandler = function (controller, options) {
        this.controller = controller;
        this.controller.generateFloat = this.controller.generateFloat || generateFloat;
        this.options = options || {};
    };

    ExpressionHandler.prototype = {
        binary: function (node) {
            var result = this.expression(node);
            //noinspection FallthroughInSwitchStatementJS
            switch (node.type) {
                case Syntax.BinaryExpression:
                case Syntax.LogicalExpression:
                case Syntax.AssignmentExpression:
                    result = "( " + result + " )";
                    break;
            }
            return result;
        },
        arguments: function (container) {
            var result = "(";
            container.forEach(function (arg, index) {
                result += this.expression(arg);
                if (index < container.length - 1) {
                    result += ", ";
                }
            }, this);
            return result + ")";
        },
        literal: function (extra, alternative) {
            var extra = extra || {},
                value = extra.staticValue !== undefined ? extra.staticValue : alternative;

            if (extra.type == Shade.TYPES.NUMBER)
                return this.controller.generateFloat(value); else
                return value;
        },
        expression: function (node) {
            if (!node) return "";

            var result = "";

            //noinspection FallthroughInSwitchStatementJS
            switch (node.type) {
                case Syntax.NewExpression:
                    result = this.controller.type(node.extra, { constructor: true });
                    result += this.arguments(node.arguments);
                    break;

                case Syntax.Literal:
                    result = this.literal(node.extra, node.value);
                    break;

                case Syntax.Identifier:
                    result = node.name;
                    break;

                case Syntax.AssignmentExpression:
                case Syntax.BinaryExpression:
                case Syntax.LogicalExpression:
                    result += this.binary(node.left);
                    result += " " + node.operator + " ";
                    result += this.binary(node.right);
                    break;
                case Syntax.UnaryExpression:
                    result = node.operator;
                    result += this.binary(node.argument);
                    break;

                case Syntax.CallExpression:
                    result = this.expression(node.callee);
                    result += this.arguments(node.arguments);
                    break;

                case Syntax.MemberExpression:
                    result = this.binary(node.object);
                    result += node.computed ? "[" : ".";
                    result += this.expression(node.property);
                    node.computed && (result += "]");
                    break;

                case Syntax.ConditionalExpression:
                    result = this.expression(node.test);
                    result += " ? ";
                    result += this.expression(node.consequent);
                    result += " : ";
                    result += this.expression(node.alternate);
                    break;

                case Syntax.UpdateExpression:
                    result = "";
                    if (node.isPrefix) {
                        result += node.operator;
                    }
                    result += this.expression(node.argument);
                    if (!node.isPrefix) {
                        result += node.operator;
                    }
                    break;
                case Syntax.ExpressionStatement:
                    result = this.expression(node.expression);
                    break;
                default:
                    result = "<unhandled: " + node.type + ">"
            }
            return result;
        },
        statement: function (node) {
            var result = "unhandled statement";
            switch (node.type) {
                case Syntax.ReturnStatement:
                    var hasArguments = node.argument;
                    result = "return" + (hasArguments ? (" " + this.expression(node.argument)) : "") + ";";
                    break;
            }
            return result;
        }
    };

    // Exports
    ns.ExpressionHandler = ExpressionHandler;


}(exports));

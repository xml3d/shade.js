(function (ns) {

    var Syntax = require('estraverse').Syntax;
    var Shade = require("../../shade.js");

    var TYPES = Shade.TYPES;


    var handleLiteral = function (literal) {
            console.log(literal);
            var value = literal.raw !== undefined ? literal.raw : literal.value;

            var number = parseFloat(value);

            if (!isNaN(number)) {
                if (value.indexOf(".") == -1) {
                    literal.extra = {
                        type: TYPES.INT,
                        value: number
                    }
                }
                else {
                    literal.extra = {
                        type: TYPES.NUMBER,
                        value: number
                    }
                }
                ;
            } else if (value === 'true') {
                literal.extra = {
                    type: TYPES.BOOLEAN,
                    value: true
                }
            } else if (value === 'false') {
                literal.extra = {
                    type: TYPES.BOOLEAN,
                    value: false
                }
            } else if (value === 'null') {
                literal.extra = {
                    type: TYPES.NULL,
                    value: null
                }
            } else {
                literal.extra = {
                    type: TYPES.STRING,
                    value: value
                }
            }


        }
        ;


    var enterExpression = function (node) {

        switch (node.type) {
            case Syntax.AssignmentExpression:
                console.log(node.type + " is not handle yet.");
                break;
            case Syntax.ArrayExpression:
                console.log(node.type + " is not handle yet.");
                break;
            case Syntax.ArrayPattern:
                console.log(node.type + " is not handle yet.");
                break;
            case Syntax.BinaryExpression:
                console.log(node.type + " is not handle yet.");
                break;
            case Syntax.CallExpression:
                console.log(node.type + " is not handle yet.");
                break;
            case Syntax.ConditionalExpression:
                console.log(node.type + " is not handle yet.");
                break;
            case Syntax.FunctionExpression:
                console.log(node.type + " is not handle yet.");
                break;
            case Syntax.Identifier:
                console.log(node.type + " is not handle yet.");
                break;
            case Syntax.Literal:
                handleLiteral(node);
                break;
            case Syntax.LogicalExpression:
                console.log(node.type + " is not handle yet.");
                break;
            case Syntax.MemberExpression:
                console.log(node.type + " is not handle yet.");
                break;
            case Syntax.NewExpression:
                console.log(node.type + " is not handle yet.");
                break;
            case Syntax.ObjectExpression:
                console.log(node.type + " is not handle yet.");
                break;
            case Syntax.ObjectPattern:
                console.log(node.type + " is not handle yet.");
                break;
            case Syntax.Property:
                console.log(node.type + " is not handle yet.");
                break;
            case Syntax.SequenceExpression:
                console.log(node.type + " is not handle yet.");
                break;
            case Syntax.ThisExpression:
                console.log(node.type + " is not handle yet.");
                break;
            case Syntax.UnaryExpression:
                console.log(node.type + " is not handle yet.");
                break;
            case Syntax.UpdateExpression:
                console.log(node.type + " is not handle yet.");
                break;
            case Syntax.YieldExpression:
                console.log(node.type + " is not handle yet.");
                break;
            default:
                throw new Error('Unknown node type: ' + node.type);


        }

    };

    var exitExpression = function (node) {

        switch (node.type) {
            case Syntax.AssignmentExpression:
                console.log(node.type + " is not handle yet.");
                break;
            case Syntax.ArrayExpression:
                console.log(node.type + " is not handle yet.");
                break;
            case Syntax.ArrayPattern:
                console.log(node.type + " is not handle yet.");
                break;
            case Syntax.BinaryExpression:
                console.log(node.type + " is not handle yet.");
                break;
            case Syntax.CallExpression:
                console.log(node.type + " is not handle yet.");
                break;
            case Syntax.ConditionalExpression:
                console.log(node.type + " is not handle yet.");
                break;
            case Syntax.FunctionExpression:
                console.log(node.type + " is not handle yet.");
                break;
            case Syntax.Identifier:
                console.log(node.type + " is not handle yet.");
                break;
            case Syntax.Literal:
                break;
            case Syntax.LogicalExpression:
                console.log(node.type + " is not handle yet.");
                break;
            case Syntax.MemberExpression:
                console.log(node.type + " is not handle yet.");
                break;
            case Syntax.NewExpression:
                console.log(node.type + " is not handle yet.");
                break;
            case Syntax.ObjectExpression:
                console.log(node.type + " is not handle yet.");
                break;
            case Syntax.ObjectPattern:
                console.log(node.type + " is not handle yet.");
                break;
            case Syntax.Property:
                console.log(node.type + " is not handle yet.");
                break;
            case Syntax.SequenceExpression:
                console.log(node.type + " is not handle yet.");
                break;
            case Syntax.ThisExpression:
                console.log(node.type + " is not handle yet.");
                break;
            case Syntax.UnaryExpression:
                console.log(node.type + " is not handle yet.");
                break;
            case Syntax.UpdateExpression:
                console.log(node.type + " is not handle yet.");
                break;
            case Syntax.YieldExpression:
                console.log(node.type + " is not handle yet.");
                break;
            default:
                throw new Error('Unknown node type: ' + node.type);


        }

    };


    ns.enterExpression = enterExpression;
    ns.exitExpression = exitExpression;
}(exports));

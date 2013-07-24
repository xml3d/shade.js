(function (ns) {

    var Syntax = require('estraverse').Syntax;
    var Shade = require("../../shade.js");

    var TYPES = Shade.TYPES;

    var checkExtra = function () {
        for (var i = 0; i < arguments.length; i++) {
            if (arguments[i].result == undefined)
                throw new Error("Missing annotations, " + arguments[i]);
        }
    }

    var Node = function(node) {
        this.node = node;
    }

    Node.prototype = {
        checkExtra: function() {
            if (this.node.result == undefined)
                throw new Error("No annotation for node: " + this.node);
        },

        getType: function() {
            this.checkExtra();
            return this.node.result.type || TYPES.ANY;
        },

        setType: function(type) {
            this.node.result = this.node.result || {};
            this.node.result.type = type;
        },

        isOfType: function(type) {
            return this.getType() == type;
        },

        isInt: function() {
            return this.isOfType(TYPES.INT);
        },
        isNumber: function() {
            return this.isOfType(TYPES.NUMBER);
        },
        isBool: function() {
            return this.isOfType(TYPES.BOOLEAN);
        }
    }

    var handlers = {
        BinaryExpression: function (node) {
            console.log(node.left, node.right);
            var left = new Node(node.left),
                right = new Node(node.right),
                result = new Node(node);

            switch (node.operator) {
                case "+":
                    // int + int => int
                    if (left.isInt() && right.isInt())
                        result.setType(TYPES.INT);
                    // int + number => number
                    else if (left.isInt() && right.isNumber() || right.isInt() && left.isNumber())
                        result.setType(TYPES.NUMBER);
                    // number + number => number
                    else if (left.isNumber() && right.isNumber())
                        result.setType(TYPES.NUMBER);


                    break;
                default:
                    throw new Error("Operator not supported: " + node.operator);
            }
        }
    };


    var handleLiteral = function (literal) {
            console.log(literal);
            var value = literal.raw !== undefined ? literal.raw : literal.value;

            var number = parseFloat(value);

            if (!isNaN(number)) {
                if (value.indexOf(".") == -1) {
                    literal.result = {
                        type: TYPES.INT,
                        value: number
                    }
                }
                else {
                    literal.result = {
                        type: TYPES.NUMBER,
                        value: number
                    }
                }
                ;
            } else if (value === 'true') {
                literal.result = {
                    type: TYPES.BOOLEAN,
                    value: true
                }
            } else if (value === 'false') {
                literal.result = {
                    type: TYPES.BOOLEAN,
                    value: false
                }
            } else if (value === 'null') {
                literal.result = {
                    type: TYPES.NULL,
                    value: null
                }
            } else {
                literal.result = {
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
                handlers.BinaryExpression(node);
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

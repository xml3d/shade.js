(function (ns) {

    var Syntax = require('estraverse').Syntax,
        Shade = require("../../interfaces.js").Shade,
        Node = require("./node.js").Node;

    var TYPES = Shade.TYPES;

    var checkExtra = function () {
        for (var i = 0; i < arguments.length; i++) {
            if (arguments[i].result == undefined)
                throw new Error("Missing annotations, " + arguments[i]);
        }
    };

    var BinaryFunctions = {
        "+" : function(a,b) { return a + b; },
        "-" : function(a,b) { return a - b; },
        "/" : function(a,b) { return a / b; },
        "*" : function(a,b) { return a * b; },
        "%" : function(a,b) { return a % b; },

        "==" : function(a,b) { return a == b; },
        "!=" : function(a,b) { return a != b; },
        "===" : function(a,b) { return a === b; },
        "!==" : function(a,b) { return a !== b; },
        "<" : function(a,b) { return a < b; },
        "<=" : function(a,b) { return a <= b; },
        ">" : function(a,b) { return a > b; },
        ">=" : function(a,b) { return a >= b; }
        };

    var UnaryFunctions = {
                "!": function(a) { return !a; },
                "-": function(a) { return -a; },
                "+": function(a) { return +a; },
                "typeof": function(a) { return typeof a; },
                "void": function(a) { return void a; },
                "delete": function(a) { return delete a; }

    };


    var handlers = {
            Literal : function (literal) {
                //console.log(literal);
                var value = literal.raw !== undefined ? literal.raw : literal.value,
                    result = new Node(literal);

                var number = parseFloat(value);

                if (!isNaN(number)) {
                    if (value.indexOf(".") == -1) {
                        result.setType(TYPES.INT);
                    }
                    else {
                        result.setType(TYPES.NUMBER);
                    }
                    result.setStaticValue(number);
                } else if (value === 'true') {
                    result.setType(TYPES.BOOLEAN);
                    result.setStaticValue(true);
                } else if (value === 'false') {
                    result.setType(TYPES.BOOLEAN);
                    result.setStaticValue(false);
                } else if (value === 'null') {
                    result.setType(TYPES.NULL);
                    result.setStaticValue(null);
                } else {
                    result.setType(TYPES.STRING);
                    result.setStaticValue(value);
                }
            },


        UnaryExpression: function (node, ctx) {
            var result = new Node(node),
                argument = new Node(node.argument),
                operator = node.operator,
                func = UnaryFunctions[operator];

            switch (operator) {
                case "!":

                    result.setType(TYPES.BOOLEAN);
                    break;
                case "+":
                case "-":
                    if (argument.canInt()) {
                        result.setType(TYPES.INT);
                    } else if (argument.canNumber()) {
                        result.setType(TYPES.NUMBER);
                    } else {
                        throw new Error("Can't evaluate '" + operator + '" for ' + argument);
                    }
                    break;
                case "~":
                case "typeof":
                case "void":
                case "delete":
                default:
                    throw new Error("Operator not yet supported: " + operator);
            }
            if (argument.hasStaticValue()) {
                result.setStaticValue(func(argument.getStaticValue()));
            } else {
                result.setDynamicValue();
            }

        },


        Identifier: function(node, ctx) {
            var result = new Node(node),
                name = node.name;

            if(name === "undefined") {
                result.setType(TYPES.UNDEFINED);
                return;
            }

            var v = ctx.findVariable(name);
            if (v) {
                result.setType(v.type);
                return;
            }


            //console.error("Identifier not handled: ", name, node);

        },

        ConditionalExpression: function(node) {
            var result = new Node(node),
                test = new Node(node.test),
                consequent = new Node(node.consequent),
                alternate = new Node(node.alternate);

            //console.log(node.test, node.consequent, node.alternate);

            if (consequent.getType() == alternate.getType() && !consequent.isObject()) {
                result.setType(consequent.getType());
            } else if (consequent.canNumber() && alternate.canNumber()) {
                result.setType(TYPES.NUMBER);
            }
            else if (test.isNullOrUndefined()) {
                result.setType(alternate.getType())
            } else {
                // We don't allow dynamic types (the type of the result depends on the value of it's operands).
                // At this point, the expression needs to evaluate to a result, otherwise it's an error
                throw new Error("Static evaluation not implemented yet");
            }

        },

        LogicalExpression: function (node) {
            var left = new Node(node.left),
                right = new Node(node.right),
                result = new Node(node),
                operator = node.operator;

            if (!(operator == "&&" || operator == "||"))
                throw new Error("Operator not supported: " + node.operator);

            if (left.getType() == right.getType() && !left.isObject()) {
                result.setType(left.getType());
            }
            else if (left.isNullOrUndefined()) {
                if (operator == "||") {
                    result.setType(right.getType())
                } else { // &&
                    result.setType(left.getType())
                }
            } else {
                // We don't allow dynamic types (the type of the result depends on the value of it's operands).
                // At this point, the expression needs to evaluate to a result, otherwise it's an error
                throw new Error("Static evaulation not implemented yet");
            }
        },




        BinaryExpression: function (node) {
            //console.log(node.left, node.right);
            var left = new Node(node.left),
                right = new Node(node.right),
                result = new Node(node),
                operator = node.operator,
                func = BinaryFunctions[operator];

            switch (operator) {
                case "+":
                case "-":
                case "*":
                case "/":
                case "%":
                    // int 'op' int => int
                    // int / int => number
                    if (left.isInt() && right.isInt()) {
                        if (operator == "/")
                            result.setType(TYPES.NUMBER);
                        else
                            result.setType(TYPES.INT);
                    }
                    // int 'op' number => number
                    else if (left.isInt() && right.isNumber() || right.isInt() && left.isNumber())
                        result.setType(TYPES.NUMBER);
                    // number 'op' number => number
                    else if (left.isNumber() && right.isNumber())
                        result.setType(TYPES.NUMBER);
                    // int 'op' null => int
                    else if (left.isInt() && right.isNullOrUndefined() || right.isInt() && left.isNullOrUndefined()) {
                        result.setType(TYPES.INT);
                    }
                    // number 'op' null => number
                    else if ((left.isNumber() && right.isNullOrUndefined()) || (right.isNumber() && left.isNullOrUndefined())) {
                        result.setType(TYPES.NUMBER);
                    }
                    else {
                        console.error(node, left.getType(), operator, right.getType());
                        throw new Error("Unhandled case for arithmetic BinaryExpression.");
                    }
                    break;
                case "==": // comparison
                case "!=":
                case "===":
                case "!==":
                case ">":
                case "<":
                case ">=":
                case "<=":
                    result.setType(TYPES.BOOLEAN);
                    break;
                default:
                    throw new Error("Operator not supported: " + operator);
            }
            if (left.hasStaticValue() && right.hasStaticValue()) {
                //console.log(left.getStaticValue(), operator, right.getStaticValue());
                result.setStaticValue(func(left.getStaticValue(), right.getStaticValue()));
            } else {
                result.setDynamicValue();
            }

        },


        MemberExpression: function(node, parent, ctx) {
            var result = new Node(node),
                objectName = node.object.name,
                propertyName =   node.property.name,
                isCall = parent.type == Syntax.CallExpression;

            if (!(objectName && propertyName)) {
                throw new Error ("Can't handle dynamic objects/properties yet.")
            }
            var obj = ctx.findObject(objectName);
            if (!obj) {
                throw new Error ("Can't find '" + objectName + "' in this context" +  ctx);
            }
            if(!obj.hasOwnProperty(propertyName)) {
                if (isCall)
                    throw new Error ("Object '" + objectName + "' has no method '"+ propertyName+"'");
                else
                    throw new Error ("Object '" + objectName + "' has no property '"+ propertyName+"'");
            }
            var prop = obj[propertyName];
            result.setType(prop.type);
            if (prop.staticValue) {
                result.setStaticValue(prop.staticValue);
            }
            if (isCall) {
                result.setCall(prop);
            }
            //if (prop.check)

        },

        CallExpression: function(node, ctx) {
            var result = new Node(node),
                callee = new Node(node.callee);

            var callInfo = callee.getCall();
            if(callInfo) {
                callInfo.evaluate(result, node.arguments);
                result.setType(callInfo.type);
                callee.clearCall();
            } else {
                throw new Error("Could not evaluate call: " + node);
            }

        }
    };




    var enterExpression = function (node, parent, ctx) {
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
                break;
            case Syntax.CallExpression:
                break;
            case Syntax.ConditionalExpression:
                break;
            case Syntax.FunctionExpression:
                console.log(node.type + " is not handle yet.");
                break;
            case Syntax.Identifier:
                break;
            case Syntax.Literal:
                handlers.Literal(node);
                break;
            case Syntax.LogicalExpression:
                break;
            case Syntax.MemberExpression:
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

    var exitExpression = function (node, parent, ctx) {

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
                handlers.CallExpression(node, ctx);
                break;
            case Syntax.ConditionalExpression:
                handlers.ConditionalExpression(node);
                break;
            case Syntax.FunctionExpression:
                console.log(node.type + " is not handle yet.");
                break;
            case Syntax.Identifier:
                handlers.Identifier(node, ctx);
                break;
            case Syntax.Literal:
                break;
            case Syntax.LogicalExpression:
                handlers.LogicalExpression(node);
                break;
            case Syntax.MemberExpression:
                handlers.MemberExpression(node, parent, ctx);
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
                handlers.UnaryExpression(node);
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

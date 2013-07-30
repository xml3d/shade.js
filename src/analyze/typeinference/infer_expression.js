(function (ns) {

    var Syntax = require('estraverse').Syntax,
        Shade = require("../../interfaces.js").Shade,
        Annotation = require("./../../base/annotation.js").Annotation;

    var TYPES = Shade.TYPES;

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
        AssignmentExpression: function (node, ctx) {
            var right = node.right.annotation;
            node.annotation.copy(right);
        },
        Literal: function (literal) {
            //console.log(literal);
            var value = literal.raw !== undefined ? literal.raw : literal.value,
                result = literal.annotation;

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
            } else {
                result.setType(TYPES.STRING);
                result.setStaticValue(value);
            }
        },


        UnaryExpression: function (node, ctx) {
            var result = node.annotation,
                argument = node.argument.annotation,
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


        Identifier: function (node, ctx) {
            var result = node.annotation,
                name = node.name;

            if (name === "undefined") {
                result.setType(TYPES.UNDEFINED);
                return;
            }
            //console.error("Identifier not handled: ", name, node);

        },

        ConditionalExpression: function (node) {
            var result = node.annotation,
                test = node.test.annotation,
                consequent = node.consequent.annotation,
                alternate = node.alternate.annotation;

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
            var left = node.left.annotation,
                right = node.right.annotation,
                result = node.annotation,
                operator = node.operator;

            if (!(operator == "&&" || operator == "||"))
                throw new Error("Operator not supported: " + node.operator);

            if (left.isNullOrUndefined()) {  // evaluates to false
                if (operator == "||") {      // false || x = x
                    result.copy(right);
                    left.eliminate();
                } else {                     // false && x = false
                    result.copy(left);
                    right.eliminate();
                }
            } else if (left.isObject() && operator == "||") { // An object that is not null evaluates to true
                result.copy(left);
                right.eliminate();
            }
            else if (left.getType() == right.getType()) {
                if (left.isObject() && left.getKind() != right.getKind()) {
                    throw new Error("Can't evaluate logical expression with two different kind of objects");
                }
                result.copy(left); // TODO: Static value?
            }
            else {
                // We don't allow dynamic types (the type of the result depends on the value of it's operands).
                // At this point, the expression needs to evaluate to a result, otherwise it's an error
                throw new Error("Static evaluation not implemented yet");
            }
        },


        BinaryExpression: function (node) {
            //console.log(node.left, node.right);
            var left = node.left.annotation,
                right = node.right.annotation,
                result = node.annotation,
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


        MemberExpression: function (node, parent, ctx) {
            var result = node.annotation,
                objectName = node.object.name,
                propertyName = node.property.name;

            if (!(objectName && propertyName)) {
                throw new Error("Can't handle dynamic objects/properties yet.")
            }
            var obj = ctx.findObject(objectName);
            if (!obj) {
                throw new Error("Can't find '" + objectName + "' in this context" + ctx);
            }
            if (!obj.hasOwnProperty(propertyName)) {
                result.setType(TYPES.UNDEFINED);
                return;
            }
            var prop = obj[propertyName];
            var propNode = new Annotation({extra: prop});
            result.copy(propNode);
            result.setGlobal(obj.global);
        },

        CallExpression: function (node, ctx) {
            var result = node.annotation,
                callee = node.callee.annotation;

            var call = callee.getCall();
            if (typeof call == "function") {
                result.copy(callee);
                call(result, node.arguments, ctx);
                callee.clearCall();
                result.clearCall();
            } else {
                throw new Error("Object '" + node.callee.object.name + "' has no method '" + node.callee.property.name + "'");
            }
        }
    };




    var enterExpression = function (node, parent, ctx) {
        switch (node.type) {
            case Syntax.AssignmentExpression:
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
                handlers.AssignmentExpression(node, ctx);
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

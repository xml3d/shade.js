(function (ns) {

    var Syntax = require('estraverse').Syntax,
        Shade = require("../../interfaces.js"),
        TYPES = Shade.TYPES,
        Annotation = require("./../../base/annotation.js").Annotation;


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


    var evaluateTruth = function(exp) {
        return !!exp;
    }

    var log = function(str) {};
    //var log = function() { console.log.apply(console, arguments); };

    /**
     *
     * @param {Array.<object>} arr Array of nodes
     * @param {Context} ctx
     * @returns {Array.<Annotation>}
     */
    function createAnnotatedNodeArray(arr, ctx) {
        return arr.map(function (arg) {
            return Annotation.createForContext(arg, ctx)
        });
    }

    var handlers = {
        AssignmentExpression: function (node, ctx) {
            var right = Annotation.createForContext(node.right, ctx),
                result = new Annotation(node);

            result.copy(right);
            if (node.left.type == Syntax.Identifier) {
                var name = node.left.name;
                if (ctx.inDeclaration === true) {
                    ctx.declareVariable(name)
                }
                ctx.updateExpression(name, right);
            } else {
                throw new Error("Assignment expression");
            }
        },
        Literal: function (literal) {
            //console.log(literal);
            var value = literal.raw !== undefined ? literal.raw : literal.value,
                result = new Annotation(literal);

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

        NewExpression: function(node, parent, ctx) {
            var result = new Annotation(node);

            var entry = ctx.findObject(node.callee.name);
            if (entry && entry._constructor) {
                var constructor = entry._constructor;
                result.setType(constructor.type, constructor.kind);
                var args = createAnnotatedNodeArray(node.arguments, ctx);
                entry._constructor.evaluate(result, args, ctx);
            }
           else {
                throw new Error("ReferenceError: " + node.callee.name + " is not defined");
            }
        },

        UnaryExpression: function (node, ctx) {
            var result = new Annotation(node),
                argument = Annotation.createForContext(node.argument, ctx),
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
            var result = new Annotation(node),
                name = node.name;

            if (name === "undefined") {
                result.setType(TYPES.UNDEFINED);
                return;
            }
        },

        ConditionalExpression: function (node, ctx) {
            var result = new Annotation(node),
                test = Annotation.createForContext(node.test, ctx),
                consequent = Annotation.createForContext(node.consequent, ctx),
                alternate = Annotation.createForContext(node.alternate, ctx);

            //console.log(node.test, node.consequent, node.alternate);

            if (test.hasStaticValue()) {
                var testResult = evaluateTruth(test.getStaticValue());
                if(testResult === true) {
                    result.copy(consequent);
                } else {
                    result.copy(alternate);
                }
                return;
            }


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

        LogicalExpression: function (node, ctx) {
            var left = Annotation.createForContext(node.left, ctx),
                right = Annotation.createForContext(node.right, ctx),
                result = new Annotation(node),
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


        BinaryExpression: function (node, ctx) {
            //console.log(node.left, node.right);
            var left = Annotation.createForContext(node.left, ctx),
                right = Annotation.createForContext(node.right, ctx),
                result = new Annotation(node),
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


        MemberExpression: function (node, parent, ctx, root) {
            var result = Annotation.createForContext(node, ctx),
                object = Annotation.createForContext(node.object, ctx),
                property = new Annotation(node.property),
                propertyName = node.property.name;

            //console.log("Member", node.object.name, node.property.name);
            if (node.computed) {
                if (object.isArray()) {
                    if (!property.canInt()) {
                        Shade.throwError(node, "Expected 'int' type for array accessor");
                    }
                    var elementInfo = object.getArrayElementType();
                    result.setType(elementInfo.type, elementInfo.kind);
                    return;
                }
                else {
                    Shade.throwError(node, "Array access only possible on arrays");
                }
            }

            if (node.object.type == Syntax.MemberExpression) {
                console.log("Here");
                var object = Annotation.createForContext(node.object, ctx);
                if (object.isUndefined()) {
                    Shade.throwError(node, "TypeError: Cannot read property '"+ propertyName + "' of undefined");
                }
                if(!object.isObject()) {
                    result.setType(TYPES.UNDEFINED);
                    return;
                }
                var instanceInfo = root.getInstanceInfoFromKind(object.getKind());
                if (!instanceInfo)  {
                    return;
                }
                var prop = instanceInfo[propertyName];
                //console.log("Property: ", prop);
                var propNode = new Annotation(node.property, prop);
                result.copy(propNode);
                return;
            }

            // node.object.type == Syntax.Identifier
            console.log(node.object.name);
            console.log(object.getType(), object.getKind());
            console.log(property.getType(), property.getKind());

            var obj = ctx.findObject(node.object.name);
            obj || Shade.throwError(node,"ReferenceError: " + node.object.name + " is not defined. Context: " + ctx.str());

            if (obj.type == TYPES.UNDEFINED) {
                Shade.throwError(node, "TypeError: Cannot read property '"+ propertyName +"' of undefined")
            }

            if (obj.type && obj.type == TYPES.OBJECT) {
                var instanceInfo = root.getInstanceInfoFromKind(obj.kind);
                obj = instanceInfo;
                result.setType(obj.type, obj.kind);
            }
            if (!obj.hasOwnProperty(propertyName)) {
                property.setType(TYPES.UNDEFINED);
                return;
            }
            var prop = obj[propertyName];
            console.log("Property: ", prop);
            var propNode = new Annotation(node.property, prop);
            result.copy(propNode);
        },

        CallExpression: function (node, ctx) {
            var result = new Annotation(node),
                callee = Annotation.createForContext(node.callee, ctx);

            var callType = node.callee.type;
            switch (callType) {

                case Syntax.MemberExpression:
                    var call = callee.getCall();
                    if (typeof call == "function") {
                        result.copy(callee);
                        var args = createAnnotatedNodeArray(node.arguments, ctx);
                        call(result, args, ctx);
                        callee.clearCall();
                        result.clearCall();
                    } else {
                        if(callee.isObject()) {
                            Shade.throwError(node, "TypeError: Object #<" + callee.getKind()+ "> has no method '"+ node.callee.property.name + "'");
                        } else {
                            Shade.throwError(node, "TypeError: Cannot call method '"+ node.callee.property.name + "' of " + callee.getType());
                        }
                    }
                    break;
                case Syntax.Identifier:
                    var functionName = node.callee.name;
                    var func = ctx.findVariable(functionName);
                    if (!(func && func.initialized)) {
                        throw new Error(functionName + " is not defined. Context: " + ctx.str());
                    }
                    // console.log(func);
                    //throw new Error("Can't call " + functionName + "() in this context: " + ctx.str());
                    break;
                default:
                        throw new Error("Unhandled CallExpression");

            }
        }
    };




    var enterExpression = function (node, parent, ctx) {
        switch (node.type) {
            case Syntax.AssignmentExpression:
                break;
            case Syntax.ArrayExpression:
                log(node.type + " is not handle yet.");
                break;
            case Syntax.ArrayPattern:
                log(node.type + " is not handle yet.");
                break;
            case Syntax.BinaryExpression:
                break;
            case Syntax.CallExpression:
                break;
            case Syntax.ConditionalExpression:
                break;
            case Syntax.FunctionExpression:
                log(node.type + " is not handle yet.");
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
                log(node.type + " is not handle yet.");
                break;
            case Syntax.ObjectExpression:
                log(node.type + " is not handle yet.");
                break;
            case Syntax.ObjectPattern:
                log(node.type + " is not handle yet.");
                break;
            case Syntax.Property:
                log(node.type + " is not handle yet.");
                break;
            case Syntax.SequenceExpression:
                log(node.type + " is not handle yet.");
                break;
            case Syntax.ThisExpression:
                log(node.type + " is not handle yet.");
                break;
            case Syntax.UnaryExpression:
                break;
            case Syntax.UpdateExpression:
                log(node.type + " is not handle yet.");
                break;
            case Syntax.YieldExpression:
                log(node.type + " is not handle yet.");
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
                log(node.type + " is not handle yet.");
                break;
            case Syntax.ArrayPattern:
                log(node.type + " is not handle yet.");
                break;
            case Syntax.BinaryExpression:
                handlers.BinaryExpression(node, ctx);
                break;
            case Syntax.CallExpression:
                handlers.CallExpression(node, ctx);
                break;
            case Syntax.ConditionalExpression:
                handlers.ConditionalExpression(node, ctx);
                break;
            case Syntax.FunctionExpression:
                log(node.type + " is not handle yet.");
                break;
            case Syntax.Identifier:
                handlers.Identifier(node, ctx);
                break;
            case Syntax.Literal:
                break;
            case Syntax.LogicalExpression:
                handlers.LogicalExpression(node, ctx);
                break;
            case Syntax.MemberExpression:
                handlers.MemberExpression(node, parent, ctx, this);
                break;
            case Syntax.NewExpression:
                handlers.NewExpression(node, parent, ctx);
                break;
            case Syntax.ObjectExpression:
                log(node.type + " is not handle yet.");
                break;
            case Syntax.ObjectPattern:
                log(node.type + " is not handle yet.");
                break;
            case Syntax.Property:
                log(node.type + " is not handle yet.");
                break;
            case Syntax.SequenceExpression:
                log(node.type + " is not handle yet.");
                break;
            case Syntax.ThisExpression:
                log(node.type + " is not handle yet.");
                break;
            case Syntax.UnaryExpression:
                handlers.UnaryExpression(node, ctx);
                break;
            case Syntax.UpdateExpression:
                log(node.type + " is not handle yet.");
                break;
            case Syntax.YieldExpression:
                log(node.type + " is not handle yet.");
                break;
            default:
                throw new Error('Unknown node type: ' + node.type);


        }

    };


    ns.enterExpression = enterExpression;
    ns.exitExpression = exitExpression;
}(exports));

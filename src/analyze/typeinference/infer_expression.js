(function (ns) {

    var Syntax = require('estraverse').Syntax,
        VisitorOption = require('estraverse').VisitorOption,
        Shade = require("../../interfaces.js"),
        TYPES = Shade.TYPES,
        Annotation = require("./../../base/annotation.js").Annotation,
        ANNO = require("./../../base/annotation.js").ANNO,
        evaluator = require("../evaluator.js");


    var enterExpression = function (node, parent, ctx) {
        var handlerName = "enter" + node.type;
        if (handlers.hasOwnProperty(handlerName)) {
            return handlers[handlerName](node, parent, ctx, this);
        }
    };

    var exitExpression = function (node, parent, ctx) {
        var handlerName = "exit" + node.type;
        if (handlers.hasOwnProperty(handlerName)) {
            return handlers[handlerName](node, parent, ctx, this);
        }
    };

    function getObjectReferenceFromNode(object, context) {
        switch (object.type) {
            case Syntax.NewExpression:
            case Syntax.CallExpression:
            case Syntax.MemberExpression:
                return context.createTypeInfo(object);
                break;
            case Syntax.Identifier:
                return context.getBindingByName(object.name);
                break;
            case Syntax.ThisExpression:
                return context.getBindingByName("this");
                break;
            default:
                throw new Error("Unhandled object type in TypeInference: " + object.type);
        }
    }

    var evaluateTruth = function(exp) {
        return !!exp;
    }

    var handlers = {

        enterLogicalExpression: function(node, parent, scope, context) {
            var result = new Annotation(node);
            context.traverse(node.left);

            var left = scope.createTypeInfo(node.left);
            var leftBool = left.getStaticTruthValue();

            if (leftBool == true && node.operator == "||") {
                return VisitorOption.Skip; // Don't evaluate right expression
            }
            if (leftBool == false && node.operator == "&&") {
                return VisitorOption.Skip; // Don't evaluate right expression
            }
            // In all other cases we also evaluate the right expression
            context.traverse(node.right);
            return VisitorOption.Skip;
        },



        enterConditionalExpression: function (node, parent, ctx, root) {
            var result = new Annotation(node);

            root.traverse(node.test);
            var test = ctx.createTypeInfo(node.test);

            // console.log(node.test, node.consequent, node.alternate);
            if (test.hasStaticValue() || test.isObject()) {
                var testResult = test.hasStaticValue() ? evaluateTruth(test.getStaticValue()) : true;
                if (testResult === true) {
                    root.traverse(node.consequent);
                    consequent = ctx.createTypeInfo(node.consequent);
                    result.copy(consequent);
                    var alternate = new Annotation(node.alternate);
                    alternate.eliminate();
                } else {
                    root.traverse(node.alternate);
                    var alternate = ctx.createTypeInfo(node.alternate);
                    result.copy(alternate);
                    var consequent = new Annotation(node.consequent);
                    consequent.eliminate();
                }
            } else {
                // We can't decide, thus traverse both;
                root.traverse(node.consequent);
                root.traverse(node.alternate);
                var consequent = ctx.createTypeInfo(node.consequent),
                    alternate = ctx.createTypeInfo(node.alternate);


                if (consequent.equals(alternate)) {
                    result.copy(consequent);
                    result.setDynamicValue();
                } else if (consequent.canNumber() && alternate.canNumber()) {
                    result.setType(TYPES.NUMBER);
                }
                else if (test.isNullOrUndefined()) {
                    result.setType(alternate.getType())
                } else {
                    // We don't allow dynamic types (the type of the result depends on the value of it's operands).
                    // At this point, the expression needs to evaluate to a result, otherwise it's an error
                    throw Shade.throwError(node, "Static evaluation not implemented yet");
                }
            }
            return VisitorOption.Skip;

        },


        enterLiteral: function (literal) {
            var value = literal.raw !== undefined ? literal.raw : literal.value,
                result = new Annotation(literal);

            var number = parseFloat(value);
            if (!isNaN(number)) {
                if (value.toString().indexOf(".") == -1) {
                    result.setType(TYPES.INT);
                }
                else {
                    result.setType(TYPES.NUMBER);
                }
            } else if (value === 'true' || value === 'false') {
                result.setType(TYPES.BOOLEAN);
            } else if (value === 'null') {
                result.setType(TYPES.NULL);
            } else {
                result.setType(TYPES.STRING);
            }
            if (!result.isNull()) {
                result.setStaticValue(evaluator.getStaticValue(literal));
            }
        },

        exitAssignmentExpression: function (node, parent, ctx) {
            var right = ctx.createTypeInfo(node.right),
                result = new Annotation(node);

            result.copy(right);
            if (node.left.type == Syntax.Identifier) {
                var name = node.left.name;
                if (ctx.inDeclaration === true) {
                    ctx.declareVariable(name, true, result)
                }
                ctx.updateTypeInfo(name, right);
            } else {
                throw new Error("Assignment expression");
            }
        },


        exitNewExpression: function(node, parent, ctx) {
            var result = new Annotation(node);

            var entry = ctx.getBindingByName(node.callee.name);
            //console.error(entry);
            if (entry && entry.hasConstructor()) {
                var constructor = entry.getConstructor();
                var args = Annotation.createAnnotatedNodeArray(node.arguments, ctx);
                var extra = constructor.evaluate(result, args, ctx);
                result.setFromExtra(extra);
            }
           else {
                throw new Error("ReferenceError: " + node.callee.name + " is not defined");
            }
        },

        exitUnaryExpression: function (node, parent, ctx) {
            var result = new Annotation(node),
                argument = ctx.createTypeInfo(node.argument),
                operator = node.operator;

            switch (operator) {
                case "!":
                    result.setType(TYPES.BOOLEAN);
                    if (argument.isObject()) {
                        result.setStaticValue(false); // !obj == false
                        return;
                    }
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
                result.setStaticValue(evaluator.getStaticValue(node));
            } else {
                result.setDynamicValue();
            }

        },


        exitIdentifier: function (node) {
            if (node.name === "undefined") {
                ANNO(node).setType(TYPES.UNDEFINED);
            }
        },



        exitLogicalExpression: function (node, parent, ctx) {
            var left = ctx.createTypeInfo(node.left),
                right = ctx.createTypeInfo(node.right),
                result = new Annotation(node),
                operator = node.operator;

            // static: true || false, dynamic: undefined
            var leftBool = left.getStaticTruthValue();
            var rightBool = right.getStaticTruthValue();

            if (operator === "||") {
                if (leftBool === false) {
                    result.copy(right);
                    left.eliminate();
                    return;
                }
                if (leftBool === true) {
                    result.copy(left);
                    right.eliminate();
                    return;
                }
                // Left is dynamic, let's check right
                if (rightBool === false) {
                    // Now the result type is always the one of the left value
                    result.copy(left);
                    right.eliminate();
                    return;
                }
            } else if (operator === "&&") {
                if (leftBool === false) {
                    // T(x) == false => x && y == x
                    result.copy(left);
                    right.eliminate();
                    return;
                }
                if (leftBool === true) {
                    result.copy(right);
                    left.eliminate();
                    return;
                }
                // Left is dynamic, let's check right
                if (rightBool === true) {
                    // Now the result type is always the one of the left value
                    result.copy(left);
                    right.eliminate();
                    return;
                }
                if (rightBool === false) {
                    // Now the result must be false
                    result.setType(TYPES.BOOLEAN);
                    result.setStaticValue(false);
                    return;
                }
            }

            if (left.getType() == right.getType()) {
                result.copy(left);
            }
            else {
                // We don't allow dynamic types (the type of the result depends on the value of it's operands).
                // At this point, the expression needs to evaluate to a result, otherwise it's an error
                Shade.throwError(node, "Type of Logical expression depends on values of its arguments. This is not supported in shade.js.");
            }
            //throw new Error("Operator not supported: " + node.operator);

        },


        exitBinaryExpression: function (node, parent, ctx) {
            //console.log(node.left, node.right);
            var left = ctx.createTypeInfo(node.left),
                right = ctx.createTypeInfo(node.right),
                result = new Annotation(node),
                operator = node.operator;

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
                        //console.error(node, left.getType(), operator, right.getType());
                        Shade.throwError(node, "Evaluates to NaN: " + left.getTypeString() + " " + operator + " " + right.getTypeString());
                    }
                    break;
                case "===":
                case "!==":
                    result.setType(TYPES.BOOLEAN);
                    if (left.isUndefined() || right.isUndefined()) {
                        var value = left.isUndefined() && right.isUndefined();
                        result.setStaticValue(operator == "===" ? value : !value);
                        return;
                    }
                    break;
                case "==": // comparison
                case "!=":
                case ">":
                case "<":
                case ">=":
                case "<=":
                    result.setType(TYPES.BOOLEAN);
                    if (left.isUndefined() || right.isUndefined()) {
                        var value = left.isUndefined() && right.isUndefined();
                        result.setStaticValue(operator == "!=" ? !value : value);
                        return;
                    }
                    break;
                default:
                    throw new Error("Operator not supported: " + operator);
            }
            if (left.hasStaticValue() && right.hasStaticValue()) {
                //console.log(left.getStaticValue(), operator, right.getStaticValue());
                result.setStaticValue(evaluator.getStaticValue(node));
            } else {
                result.setDynamicValue();
            }

        },


        exitMemberExpression: function (node, parent, ctx, root) {
            var resultType = ctx.createTypeInfo(node),
                objectAnnotation = new Annotation(node.object),
                propertyAnnotation = new Annotation(node.property);

            //console.log("Member", node.object.name, node.property.name);
            if (node.computed) {
                if (objectAnnotation.isArray()) {
                    // Property is computed, thus it could be a variable
                    var propertyType =  ctx.createTypeInfo(node.property);
                    if (!propertyType.canInt()) {
                        Shade.throwError(node, "Expected 'int' type for array accessor");
                    }
                    var elementInfo = objectAnnotation.getArrayElementType();
                    resultType.setType(elementInfo.type, elementInfo.kind);
                    return;
                }
                else {
                    Shade.throwError(node, "TypeError: Cannot access member via computed value from object '" + objectAnnotation.getTypeString());
                }
            }
            var propertyName = node.property.name;

            var objectOfInterest = getObjectReferenceFromNode(node.object, ctx);

            objectOfInterest || Shade.throwError(node,"ReferenceError: " + node.object.name + " is not defined. Context: " + ctx.str());

            if (objectOfInterest.getType() == TYPES.UNDEFINED) {  // e.g. var a = undefined; a.unknown;
                Shade.throwError(node, "TypeError: Cannot read property '"+ propertyName +"' of undefined")
            }
            if (objectOfInterest.getType() != TYPES.OBJECT) { // e.g. var a = 5; a.unknown;
                resultType.setType(TYPES.UNDEFINED);
                return;
            }

            var objectInfo = ctx.getObjectInfoFor(objectOfInterest);
            if(!objectInfo)
                Shade.throwError(node, "Internal: Incomplete registration for object: " + objectOfInterest.getTypeString() + ", " + JSON.stringify(node.object));

            objectAnnotation.copy(objectOfInterest);
            if (!objectInfo.hasOwnProperty(propertyName)) {
                resultType.setType(TYPES.UNDEFINED);
                propertyAnnotation.setType(TYPES.UNDEFINED);
                return;
            }

            var propertyTypeInfo = objectInfo[propertyName];
            propertyAnnotation.setFromExtra(propertyTypeInfo);
            resultType.setFromExtra(propertyTypeInfo);
        },

        exitCallExpression: function (node, parent, ctx, root) {
            var result = new Annotation(node);

            // Call on an object, e.g. Math.cos()
            if (node.callee.type == Syntax.MemberExpression) {
                var callingObject = getObjectReferenceFromNode(node.callee, ctx);

                if (!callingObject.isFunction()) { // e.g. Math.PI()
                    Shade.throwError(node, "TypeError: Object #<" + callingObject.getTypeString() + "> has no method '"+ node.callee.property.name + "'");
                }

                var object = node.callee.object,
                    propertyName = node.callee.property.name;

                var objectReference = getObjectReferenceFromNode(object, ctx);
                if(!objectReference)  {
                    Shade.throwError(node, "Internal: No object info for: " + object);
                }

                var objectInfo = ctx.getObjectInfoFor(objectReference);
                if(!objectInfo) { // Every object needs an info, otherwise we did something wrong
                    Shade.throwError(node, "Internal Error: No object registered for: " + objectReference.getTypeString() + JSON.stringify(node.object));
                }
                if (objectInfo.hasOwnProperty(propertyName)) {
                    var propertyHandler = objectInfo[propertyName];
                    if (typeof propertyHandler.evaluate == "function") {
                        var args = Annotation.createAnnotatedNodeArray(node.arguments, ctx);
                        var extra = propertyHandler.evaluate(result, args, ctx, objectReference, root);
                        result.setFromExtra(extra);
                        return;
                    } else {
                        Shade.throwError(node, "Internal: no handler registered for '" + propertyName + "'");
                    }
                } else {
                    Shade.throwError(node, "TypeError: " + objectReference.getTypeString() + " has no method '" + propertyName + "')");
                }

            }  else if (node.callee.type == Syntax.Identifier) {
                var functionName = node.callee.name;
                var func = ctx.getBindingByName(functionName);
                if (!func) {
                    Shade.throwError(node, "ReferenceError: " + functionName + " is not defined");
                }
                if(!func.isFunction()) {
                    Shade.throwError(node, "TypeError: " + func.getTypeString() + " is not a function");
                }
                var args = Annotation.createAnnotatedNodeArray(node.arguments, ctx);
                var definingContext = ctx.getContextForName(functionName);
                try {
                var extra = root.getFunctionInformationFor(ctx.getVariableIdentifier(functionName), args, definingContext);
                } catch(e) {
                    Shade.throwError(node, "Failure in function call: " + e.message);
                }
                extra && result.setFromExtra(extra);
                node.callee.name = extra.newName;
                return;
            }

            throw new Error("Unhandled CallExpression:" + node.callee.type);

        }
    };

    ns.enterExpression = enterExpression;
    ns.exitExpression = exitExpression;
}(exports));

(function (ns) {

    var common = require("./../../base/common.js"),
        Shade = require("../../interfaces.js"),
        evaluator = require("../constants/evaluator.js"),
        estraverse = require('estraverse');

    var codegen = require('escodegen');

    var Syntax = common.Syntax,
        TYPES = Shade.TYPES,
        ANNO = common.ANNO;

    var generateErrorInformation = function() {
        var args = Array.prototype.slice.call(arguments);
        var node = args.shift(),
            loc = node.loc,
            msg = "";

        if (loc && loc.start.line) {
            msg = ", Line " + loc.start.line;
        }
        msg += ": " + codegen.generate(node);
        return { message: args.join(" ") + msg, loc: loc};
    };

    var handlers = {

        /**
         * @param node
         */
        Literal: function (node) {
            var value = node.raw !== undefined ? node.raw : node.value,
                result = ANNO(node);

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
        },

        /**
         * ExpressionStatement: Just copy the result from the actual expression
         */
        ExpressionStatement: function (node) {
            var result = ANNO(node),
                expression = ANNO(node.expression);
            result.copy(expression);
        },


        /**
         * ReturnStatement: If return has an argument, copy the TypeInfo
         * form the argument, otherwise it's undefined. Inform the scope on
         * the return type of this return branch.
         */
        ReturnStatement: function (node, parent, context) {
            var result = ANNO(node),
                argument = context.getTypeInfo(node.argument);

            if (argument) {
                result.copy(argument);
            } else {
                result.setType(TYPES.UNDEFINED);
            }
            context.getScope().updateReturnInfo(result);
        },

        /**
         * NewExpression: Find the type of the Callee from
         * the scope and evaluate based on annotated parameters
         */
        NewExpression: function(node, parent, context) {
            var result = ANNO(node);

            var scope = context.getScope();
            var entry = scope.getBindingByName(node.callee.name);
            if (entry && entry.hasConstructor()) {
                var constructor = entry.getConstructor();
                var args = context.getTypeInfo(node.arguments);
                try {
                    var extra = constructor.evaluate(result, args, scope);
                    result.setFromExtra(extra);
                } catch (e) {
                    result.setInvalid(e);
                }
            }
            else {
                result.setInvalid(generateErrorInformation(node, "ReferenceError: " + node.callee.name + " is not defined"));
            }
        },


        /**
         * UnaryExpression
         */
        UnaryExpression: function (node, parent, context) {
            var result = ANNO(node),
                argument = context.getTypeInfo(node.argument),
                operator = node.operator;

            //noinspection FallthroughInSwitchStatementJS
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
                        result.setInvalid(generateErrorInformation(node, "NotANumberError"));
                    }
                    break;
                case "~":
                case "typeof":
                case "void":
                case "delete":
                default:
                    result.setInvalid(generateErrorInformation(node, "NotSupportedError"));
            }
        },

        /**
         * 'Undefined' is an identifier. Variables, names of functions and
         * member properties are handled within parent expressions
         */
        Identifier: function (node) {
            if (node.name === "undefined") {
                ANNO(node).setType(TYPES.UNDEFINED);
            }
        },

        /**
         * BinaryExpression
         */
        BinaryExpression: function (node, parent, context) {
            //console.log(node.left, node.right);
            var left = context.getTypeInfo(node.left),
                right = context.getTypeInfo(node.right),
                result = ANNO(node),
                operator = node.operator;

            if(!(left.isValid() && right.isValid())) {
                result.setInvalid()
                return;
            }

            //noinspection FallthroughInSwitchStatementJS
            switch (operator) {
                case "+":
                case "-":
                case "*":
                case "/":
                case "%":
                    // int 'op' int => int
                    // int / int => number
                    if (left.canInt() && right.canInt()) {
                        if (operator == "/")
                            result.setType(TYPES.NUMBER);
                        else
                            result.setType(TYPES.INT);
                    }
                    // int 'op' number => number
                    else if (left.canInt() && right.isNumber() || right.canInt() && left.isNumber()) {
                        result.setType(TYPES.NUMBER);
                    }
                    // number 'op' number => number
                    else if (left.isNumber() && right.isNumber()) {
                        result.setType(TYPES.NUMBER);
                        // int 'op' null => int
                    }
                    else if (left.isInt() && right.isNullOrUndefined() || right.isInt() && left.isNullOrUndefined()) {
                        result.setType(TYPES.INT);
                    }
                    // number 'op' null => number
                    else if ((left.isNumber() && right.isNullOrUndefined()) || (right.isNumber() && left.isNullOrUndefined())) {
                        result.setType(TYPES.NUMBER);
                    }
                    else {
                        // NaN
                        result.setType(TYPES.INVALID);
                        result.setError(generateErrorInformation(node, "NotANumberError"))
                    }
                    break;
                case "===":
                case "!==":
                case "==": // comparison
                case "!=":
                case ">":
                case "<":
                case ">=":
                case "<=":
                    result.setType(TYPES.BOOLEAN);
                    break;
                default:
                    throw new Error("Operator not supported: " + operator);
            }
        },

        AssignmentExpression: function (node, parent, context) {
            var right = context.getTypeInfo(node.right),
                result = ANNO(node);

            result.copy(right);

            // Check, if a assigned variable still has the same type as
            // before and update type of uninitialized variables.
            if (node.left.type == Syntax.Identifier && !context.inDeclaration() && right.isValid()) {
                var name = node.left.name;
                var scope = context.getScope();
                scope.updateTypeInfo(name, right);
            }
        },


        MemberExpression: function (node, parent, context) {
            var resultType = context.getTypeInfo(node),
                objectAnnotation = ANNO(node.object),
                propertyAnnotation = ANNO(node.property),
                scope = context.getScope();

            if(!objectAnnotation.isValid()) {
                resultType.setInvalid();
                return;
            }

            //console.log("Member", node.object.name, node.property.name);
            if (node.computed) {
                if (objectAnnotation.isArray()) {
                    // Property is computed, thus it could be a variable
                    var propertyType =  context.getTypeInfo(node.property);
                    if (!propertyType.canInt()) {
                        Shade.throwError(node, "Expected 'int' type for array accessor");
                    }
                    var elementInfo = objectAnnotation.getArrayElementType();
                    resultType.setType(elementInfo.type, elementInfo.kind);
                    return;
                }
                else {
                    resultType.setType(TYPES.INVALID);
                    resultType.setError(generateErrorInformation(node, "Cannot access member via computed value from object", objectAnnotation.getTypeString()));

                    //Shade.throwError(node, "TypeError: Cannot access member via computed value from object '" + objectAnnotation.getTypeString());
                }
            }
            var propertyName = node.property.name;

            var objectOfInterest = common.getObjectReferenceFromNode(node.object, scope);

            objectOfInterest || Shade.throwError(node,"ReferenceError: " + node.object.name + " is not defined. Context: " + scope.str());

            if (!objectOfInterest.isValid() || objectOfInterest.getType() == TYPES.UNDEFINED) {  // e.g. var a = undefined; a.unknown;
                resultType.setType(TYPES.INVALID); // TypeError: Cannot read property 'x' of undefined
                resultType.setError(generateErrorInformation(node, "TypeError: Cannot read property '" + propertyName + "' of undefined"));
                return;
            }
            if (objectOfInterest.getType() != TYPES.OBJECT) { // e.g. var a = 5; a.unknown;
                resultType.setType(TYPES.UNDEFINED);
                return;
            }

            var objectInfo = scope.getObjectInfoFor(objectOfInterest);
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

        CallExpression: function (node, parent, context) {
            var result = ANNO(node),
                scope = context.getScope(),
                extra, args;

            // Call on an object, e.g. Math.cos()
            if (node.callee.type == Syntax.MemberExpression) {

                var memberExpression = context.getTypeInfo(node.callee);
                if(!memberExpression.isValid()) {
                    result.setInvalid();
                    return;
                }

                var object = node.callee.object,
                    propertyName = node.callee.property.name;

                var objectReference = context.getTypeInfo(object);
                if(!objectReference)  {
                    Shade.throwError(node, "Internal: No object info for: " + object);
                }
                var objectInfo = scope.getObjectInfoFor(objectReference);
                if(!objectInfo) { // Every object needs an info, otherwise we did something wrong
                    Shade.throwError(node, "Internal Error: No object registered for: " + objectReference.getTypeString() + JSON.stringify(node.object));
                }

                if (!memberExpression.isFunction()) { // e.g. Math.PI()
                    result.setInvalid();
                    if (objectInfo.hasOwnProperty(propertyName)) {
                      result.setError(generateErrorInformation(node, "TypeError: Property '" + propertyName + "' of object #<"+ objectReference.getTypeString() +"> is not a function"));
                    } else {
                      result.setError(generateErrorInformation(node, "TypeError: " + (object.type == Syntax.ThisExpression ? "'this'" : objectReference.getTypeString())+ " has no method '"+ propertyName + "'"));
                    }
                    return;
                }


                if (objectInfo.hasOwnProperty(propertyName)) {
                    var propertyHandler = objectInfo[propertyName];
                    if (typeof propertyHandler.evaluate == "function") {
                        try {
                            args = context.getTypeInfo(node.arguments);
                            extra = propertyHandler.evaluate(result, args, scope, objectReference, context);
                            result.setFromExtra(extra);
                        } catch(e) {
                            result.setType(TYPES.INVALID);
                            result.setError(e);
                        }
                        return;
                    } else {
                        Shade.throwError(node, "Internal: no handler registered for '" + propertyName + "'");
                    }
                } else {
                    result.setType(TYPES.UNDEFINED);
                    return;
                    //Shade.throwError(node, "TypeError: " + objectReference.getTypeString() + " has no method '" + propertyName + "')");
                }

            }  else if (node.callee.type == Syntax.Identifier) {
                var functionName = node.callee.name;
                var func = scope.getBindingByName(functionName);
                if (!func) {
                    Shade.throwError(node, "ReferenceError: " + functionName + " is not defined");
                }
                if(!func.isFunction()) {
                    Shade.throwError(node, "TypeError: " + func.getTypeString() + " is not a function");
                }
                args = common.createTypeInfo(node.arguments, scope);
                try {
                    extra = context.callFunction(scope.getVariableIdentifier(functionName), args);
                    extra && result.setFromExtra(extra);
                    node.callee.name = extra.newName;
                } catch(e) {
                    result.setType(TYPES.INVALID);
                    result.setError(generateErrorInformation(node, "Failure in function call: ", e.msg))
                }
                return;
            }

            throw new Error("Unhandled CallExpression:" + node.callee.type);

        },

        VariableDeclaration: function (node, parent, context) {
            context.setInDeclaration(false);
        },

        LogicalExpression: function (node, parent, context) {
            var left = context.getTypeInfo(node.left),
                right = context.getTypeInfo(node.right),
                result = ANNO(node);

            if (left.equals(right)) {
                result.copy(left);
            }
        },

        ConditionalExpression: function (node, parent, context) {
            var consequent = context.getTypeInfo(node.consequent),
                alternate = context.getTypeInfo(node.alternate),
                test = context.getTypeInfo(node.test),
                result = ANNO(node);

            if (consequent.equals(alternate)) {
                result.copy(consequent);
            } else if (consequent.canNumber() && alternate.canNumber()) {
                result.setType(TYPES.NUMBER);
            } else if(test.isNullOrUndefined()) {
                result.copy(alternate);
            }

        }

    };

    ns.annotateRight  = function(ast) {

        if(!ast)
            throw Error("No node to analyze");

        var controller = new estraverse.Controller();
        var context = this;

        controller.traverse(ast, {
            enter: function(node) {
                if(node.type == Syntax.VariableDeclaration) {
                    context.setInDeclaration(true);
                }
            },
            leave: function(node, parent) {
                if (handlers.hasOwnProperty(node.type)) {
                    return handlers[node.type].call(this, node, parent, context);
                }
                return null;
            }
        });

    }
}(exports));

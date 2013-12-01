(function (ns) {

    var common = require("./../../base/common.js"),
        Shade = require("../../interfaces.js"),
        evaluator = require("../constants/evaluator.js"),
        estraverse = require('estraverse');

    var codegen = require('escodegen');

    var Syntax = common.Syntax,
        VisitorOption = common.VisitorOption,
        TYPES = Shade.TYPES,
        ANNO = common.ANNO;


    var enterExpression = function (context, node, parent) {
        var handlerName = "enter" + node.type;
        if (handlers.hasOwnProperty(handlerName)) {
            return handlers[handlerName].call(this, node, parent, context);
        }
    };

    var exitExpression = function (context, node, parent) {
        var handlerName = "exit" + node.type;
        if (handlers.hasOwnProperty(handlerName)) {
            return handlers[handlerName].call(this, node, parent, context);
        }
    };


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
    }

    var handlers = {

        /**
         * @param node
         */
        enterLiteral: function (node) {
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
        exitExpressionStatement: function (node, parent, context) {
            var result = ANNO(node),
                expression = ANNO(node.expression);
            result.copy(expression);
        },


        /**
         * ReturnStatement: If return has an argument, copy the TypeInfo
         * form the argument, otherwise it's undefined. Inform the scope on
         * the return type of this return branch.
         */
        exitReturnStatement: function (node, parent, context) {
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
        exitNewExpression: function(node, parent, context) {
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
                    result.setType(TYPES.INVALID);
                }
            }
            else {
                throw new Error("ReferenceError: " + node.callee.name + " is not defined");
            }
        },


        /**
         * UnaryExpression
         */
        exitUnaryExpression: function (node, parent, context) {
            var result = ANNO(node),
                argument = context.getTypeInfo(node.argument),
                operator = node.operator;

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
        },

        /**
         * 'Undefined' is an identifier. Variables, names of functions and
         * member properties are handled within parent expressions
         */
        exitIdentifier: function (node) {
            if (node.name === "undefined") {
                ANNO(node).setType(TYPES.UNDEFINED);
            }
        },

        /**
         * BinaryExpression
         */
        exitBinaryExpression: function (node, parent, context) {
            //console.log(node.left, node.right);
            var left = context.getTypeInfo(node.left),
                right = context.getTypeInfo(node.right),
                result = ANNO(node),
                operator = node.operator;

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
                        result.setError(generateErrorInformation(node))
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

        exitAssignmentExpression: function (node, parent, context) {
            var right = context.getTypeInfo(node.right),
                result = ANNO(node);

            result.copy(right);

            // Check, if a assigned variable still has the same type as
            // before and update type of uninitialized variables.
            if (node.left.type == Syntax.Identifier && !context.inDeclaration()) {
                var name = node.left.name;
                var scope = context.getScope();
                scope.updateTypeInfo(name, right);
            }
        },


        exitMemberExpression: function (node, parent, context) {
            var resultType = context.getTypeInfo(node),
                objectAnnotation = ANNO(node.object),
                propertyAnnotation = ANNO(node.property),
                scope = context.getScope();

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
                    resultType.setError(generateErrorInformation(node, "Cannot access member via computed value from object", objectAnnotation.getTypeString()))

                    //Shade.throwError(node, "TypeError: Cannot access member via computed value from object '" + objectAnnotation.getTypeString());
                }
            }
            var propertyName = node.property.name;

            var objectOfInterest = common.getObjectReferenceFromNode(node.object, scope);

            objectOfInterest || Shade.throwError(node,"ReferenceError: " + node.object.name + " is not defined. Context: " + scope.str());

            if (objectOfInterest.getType() == TYPES.UNDEFINED) {  // e.g. var a = undefined; a.unknown;
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

        exitCallExpression: function (node, parent, context) {
            var result = ANNO(node),
                scope = context.getScope();

            // Call on an object, e.g. Math.cos()
            if (node.callee.type == Syntax.MemberExpression) {
                var callingObject = context.getTypeInfo(node.callee);
                var object = node.callee.object,
                    propertyName = node.callee.property.name;

                var objectReference = context.getTypeInfo(object);
                if(!objectReference)  {
                    Shade.throwError(node, "Internal: No object info for: " + object);
                }

                if (!callingObject.isFunction()) { // e.g. Math.PI()
                    result.setType(TYPES.UNDEFINED);
                    return;
                }


                var objectInfo = scope.getObjectInfoFor(objectReference);
                if(!objectInfo) { // Every object needs an info, otherwise we did something wrong
                    Shade.throwError(node, "Internal Error: No object registered for: " + objectReference.getTypeString() + JSON.stringify(node.object));
                }
                if (objectInfo.hasOwnProperty(propertyName)) {
                    var propertyHandler = objectInfo[propertyName];
                    if (typeof propertyHandler.evaluate == "function") {
                        try {
                            var args = context.getTypeInfo(node.arguments);
                            var extra = propertyHandler.evaluate(result, args, scope, objectReference, context);
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
                var args = common.createTypeInfo(node.arguments, scope);
                try {
                    var extra = context.callFunction(scope.getVariableIdentifier(functionName), args);
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

        enterVariableDeclaration: function (node, parent, context) {
            context.setInDeclaration(true);
        },

        exitVariableDeclaration: function (node, parent, context) {
            context.setInDeclaration(false);
        },

        exitLogicalExpression: function (node, parent, context) {
            var left = context.getTypeInfo(node.left),
                right = context.getTypeInfo(node.right),
                result = ANNO(node),
                operator = node.operator;

            if (left.equals(right)) {
                result.copy(left);
            }
        },

        exitConditionalExpression: function (node, parent, context) {
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

    ns.annotateRight  = function(ast, propagatedConstants) {

        if(!ast)
            throw Error("No node to analyze");

        var controller = new estraverse.Controller();

        controller.traverse(ast, {
            enter: enterExpression.bind(controller, this),
            leave: exitExpression.bind(controller, this)
        })

    }
}(exports));

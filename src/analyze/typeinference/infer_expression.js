// Dependencies
var assert = require("assert");
var common = require("../../base/common.js"),
    Shade = require("../../interfaces.js"),
    evaluator = require("../constants/evaluator.js"),
    estraverse = require('estraverse'),
    ErrorHandler = require("../../type-system/errors.js");

var codegen = require('escodegen');
var TYPES = require("../../interfaces.js").TYPES;

// Shortcuts
var Syntax = common.Syntax;
var ANNO = common.ANNO;
var generateErrorInformation = ErrorHandler.generateErrorInformation;
var ERROR_TYPES = ErrorHandler.ERROR_TYPES;

var debug = false;

var handlers = {

    ArrayExpression: function (node, parent, context) {
        var result = ANNO(node), elements = context.getTypeInfo(node.elements), elementType = ANNO({});

        result.setType(TYPES.ARRAY);
        elements.forEach(function (element, index) {
            if (!index) {
                elementType.copyFrom(element);
            } else {
                if (!elementType.setCommonType(elementType, element)) {
                    result.setInvalid(generateErrorInformation(node, ERROR_TYPES.SHADEJS_ERROR, "shade.js does not support inhomogenous arrays: [", elements.map(function (e) {
                        return e.getTypeString()
                    }).join(", "), "]"));
                }
            }
        });
    },

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
        if (!result.isNull()) {
            result.setConstantValue(evaluator.getConstantValue(node));
        }
    },

    /**
     * ExpressionStatement: Just copy the result from the actual expression
     */
    ExpressionStatement: function (node) {
        var result = ANNO(node),
            expression = ANNO(node.expression);
        result.copyFrom(expression);
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
            result.copyFrom(argument);
        } else {
            result.setType(TYPES.UNDEFINED);
        }
        context.getScope().updateReturnInfo(result);
    },

    /**
     * NewExpression: Find the type of the Callee from
     * the scope and evaluate based on annotated parameters
     */
    NewExpression: function (node, parent, context) {
        var result = ANNO(node), scope = context.getScope();

        // Be on the safe side, assume result is static independently of former annotations
        result.setDynamicValue();

        var func = scope.type(node.callee);
        if (!func.isFunction()) {  // e.g. var a = undefined; a.unknown;
            result.setInvalid(generateErrorInformation(node, ERROR_TYPES.TYPE_ERROR, node.callee.name, "is not a function"));
            return;
        }

        var constructor = func.ctor;
        assert(typeof constructor == "function");
        var args = context.getTypeInfo(node.arguments);
        try {
            var extra = constructor(result, args, scope);
            result.setFromExtra(extra);
        } catch (e) {
            result.setInvalid(e);
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
                if (argument.canObject()) {
                    result.setConstantValue(false); // !obj == false
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
                    result.setInvalid(generateErrorInformation(node, ERROR_TYPES.NAN_ERROR));
                }
                break;
            case "typeof":
                result.setType(TYPES.STRING);
                if (argument.isValid()) {
                    result.setConstantValue(argument.getJavaScriptTypeString());
                }
                return;

            case "~":
            case "void":
            case "delete":
            default:
                result.setInvalid(generateErrorInformation(node, ERROR_TYPES.SHADEJS_ERROR, operator, "is not supported."));
        }
        if (argument.hasConstantValue()) {
            result.setConstantValue(evaluator.getConstantValue(node));
        } else {
            result.setDynamicValue();
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
            operator = node.operator,
            value;

        if (!(left.isValid() && right.isValid())) {
            result.setInvalid();
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
                else if (left.isInt() && right.isNull() || right.isInt() && left.isNull()) {
                    result.setType(TYPES.INT);
                }
                // number 'op' null => number
                else if ((left.isNumber() && right.isNull()) || (right.isNumber() && left.isNull())) {
                    result.setType(TYPES.NUMBER);
                }
                else {
                    // NaN

                    var message = "";
                    // Special handling for undefined, as this is the main reason for this error
                    if (left.isNullOrUndefined()) {
                        message = codegen.generate(node.left) + " is undefined";
                    } else if (right.isNullOrUndefined()) {
                        message = codegen.generate(node.right) + " is undefined";
                    }
                    result.setInvalid(generateErrorInformation(node, ERROR_TYPES.NAN_ERROR, message));
                }
                break;
            case "===":
            case "!==":
                result.setType(TYPES.BOOLEAN);
                if (left.isUndefined() || right.isUndefined()) {
                    value = left.isUndefined() && right.isUndefined();
                    result.setConstantValue(operator == "===" ? value : !value);
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
                    value = left.isUndefined() && right.isUndefined();
                    result.setConstantValue(operator == "!=" ? !value : value);
                    return;
                }
                break;
            default:
                result.setInvalid(generateErrorInformation(node, ERROR_TYPES.SHADEJS_ERROR, operator, "is not supported."));
                return;
        }
        if (left.hasConstantValue() && right.hasConstantValue()) {
            //console.log(left.getConstantValue(), operator, right.getConstantValue());
            result.setConstantValue(evaluator.getConstantValue(node));
        } else {
            result.setDynamicValue();
        }
    },

    UpdateExpression: function (node, parent, context) {
        var argument = context.getTypeInfo(node.argument),
            result = ANNO(node);
        if (argument.canNumber()) {
            result.copyFrom(argument);
            if (node.prefix && argument.hasConstantValue()) {
                if (node.operator == "++") {
                    result.setConstantValue(argument.getConstantValue() + 1)
                } else if (node.operator == "--") {
                    result.setConstantValue(argument.getConstantValue() - 1)
                } else {
                    throw new Error("Operator not supported: " + node.operator);
                }
            }
        } else {
            // e.g. var a = {}; a++;
            result.setInvalid(generateErrorInformation(node, ERROR_TYPES.NAN_ERROR));
        }
    },

    AssignmentExpression: function (node, parent, context) {
        var right = context.getTypeInfo(node.right),
            result = ANNO(node);

        result.copyFrom(right);
        result.setDynamicValue();
        result.clearUniformDependencies();

        // Check, if a assigned variable still has the same type as
        // before and update type of uninitialized variables.
        if (node.left.type == Syntax.Identifier && !context.inDeclaration() && right.isValid()) {
            var name = node.left.name;
            var scope = context.getScope();
            scope.updateTypeInfo(name, right, node);
        }
    },


    MemberExpression: function (node, parent, context) {
        var resultType = context.getTypeInfo(node),
            objectAnnotation = context.getTypeInfo(node.object),
            propertyAnnotation = ANNO(node.property),
            scope = context.getScope();

        if (!objectAnnotation.isValid()) {
            resultType.setInvalid();
            return;
        }

        //console.log("Member", node.object.name, node.property.name, node.computed);
        if (node.computed) {
            if (objectAnnotation.isArray()) {
                // Property is computed, thus it could be a variable
                var propertyType = context.getTypeInfo(node.property);
                assert(propertyType.canNumber(), "Expected 'int' or 'number' type for array accessor");

                var elementInfo = objectAnnotation.getArrayElementType();
                resultType.setType(elementInfo.type, elementInfo.kind);
                return;
            }
            else {
                resultType.setInvalid(generateErrorInformation(node, ERROR_TYPES.SHADEJS_ERROR, "no array access to object yet"));
                return;
            }
        }
        var propertyName = node.property.name;

        var objectOfInterest = scope.type(node.object);
        if(!objectOfInterest) {
            resultType.setInvalid(generateErrorInformation(node, ERROR_TYPES.REFERENCE_ERROR,  node.object.name + " is not defined"));
            return;
        }

        if (!objectOfInterest.isValid() || objectOfInterest.getType() == TYPES.UNDEFINED) {  // e.g. var a = undefined; a.unknown;
            resultType.setInvalid(generateErrorInformation(node, ERROR_TYPES.TYPE_ERROR, "Cannot read property '" + propertyName + "' of undefined"));
            return;
        }
        if (objectOfInterest.getType() != TYPES.OBJECT) { // e.g. var a = 5; a.unknown;
            resultType.setType(TYPES.UNDEFINED);
            return;
        }

        objectAnnotation.copyFrom(objectOfInterest);

        if (!objectOfInterest.hasProperty(propertyName)) {
            resultType.setType(TYPES.UNDEFINED);
            propertyAnnotation.setType(TYPES.UNDEFINED);
            return;
        }

        var propertyTypeInfo = objectOfInterest.getPropertyInfo(propertyName);
        propertyAnnotation.copyFrom(propertyTypeInfo);
        resultType.copyFrom(propertyAnnotation);
    },

    ThisExpression: function (node, parent, context) {
        var result = ANNO(node),
            scope = context.getScope(),
            thisType = scope.get("this");
        assert(thisType);
        result.copyFrom(thisType);
    },

    CallExpression: function (node, parent, context) {
        var result = ANNO(node),
            scope = context.getScope(),
            args = context.getTypeInfo(node.arguments),
            extra, staticValue;

        if (!args.every(function (arg) {
                return arg.isValid()
            })) {
            result.setInvalid(generateErrorInformation(node, ERROR_TYPES.SHADEJS_ERROR, "Not all arguments types of call expression could be evaluated"));
            return;
        }
        // Be on the safe side, assume result is static independently of former annotations
        result.setDynamicValue();

        // Call on an object, e.g. Math.cos()
        if (node.callee.type == Syntax.MemberExpression) {

            var memberExpression = context.getTypeInfo(node.callee);
            if (!memberExpression.isValid()) {
                result.setInvalid();
                return;
            }

            var object = node.callee.object,
                propertyName = node.callee.property.name;

            var objectReference = scope.type(object);

            // This should already have been handled by parent MemberExpression
            assert(objectReference.isValid(), "No object info for:" + object);

            if (!memberExpression.isFunction()) { // e.g. Math.PI()
                var msg = codegen.generate(node.callee) + " is not a function";
                result.setInvalid(generateErrorInformation(node, ERROR_TYPES.TYPE_ERROR, msg));
                return;
            }

            var propertyHandler = objectReference.getPropertyInfo(propertyName);
            assert(propertyHandler.canEvaluate(), "Internal: no handler registered for function '" + propertyName + "'");

            try {
                extra = propertyHandler.evaluate(node, args, scope, objectReference);
                result.setFromExtra(extra);
            } catch (e) {
                result.setInvalid(generateErrorInformation(node, e.message));
                return;
            }

            // If the evaluation methods already computed a constant value, we can skip that part
            if (result.hasConstantValue()) {
                return;
            }

            // If we have a type, evaluate static value
            if (!propertyHandler.canComputeStaticValue()) {
                debug && console.warn("No static evaluation exists for function", codegen.generate(node));
                return;
            }
            staticValue = propertyHandler.computeStaticValue(result, args, scope, objectReference);
            if (staticValue !== undefined) {
                result.setConstantValue(staticValue);
            }
            return;


        } else if (node.callee.type == Syntax.Identifier) {
            var functionName = node.callee.name;
            var func = scope.get(functionName);
            if (!func) {
                result.setInvalid(generateErrorInformation(node, ERROR_TYPES.REFERENCE_ERROR, functionName, "is not defined"));
                return;
            }
            if (!func.isFunction()) {
                result.setInvalid(generateErrorInformation(node, ERROR_TYPES.TYPE_ERROR, func.getTypeString(), "is not a function"));
                return;
            }
            try {
                extra = context.callFunction(scope.getVariableIdentifier(functionName), args);
                extra && result.setFromExtra(extra);
            } catch (e) {
                result.setInvalid(generateErrorInformation(node, ERROR_TYPES.SHADEJS_ERROR, "Failure in function call: ", e.message));
            }
            return;
        }
        result.setInvalid(generateErrorInformation(node, ERROR_TYPES.SHADEJS_ERROR, "Internal:", "Unhandled CallExpression", node.callee.type));
    },

    VariableDeclarator: function (node, parent, context) {
        var init = node.init ? context.getTypeInfo(node.init) : null,
            result = ANNO(node);
        if (init) {
            ANNO(node.init).copyFrom(init);
            result.copyFrom(init);
        }
    },

    VariableDeclaration: function (node, parent, context) {
        context.setInDeclaration(false);
    },

    LogicalExpression: function (node, parent, context) {
        var left = context.getTypeInfo(node.left),
            right = context.getTypeInfo(node.right),
            result = ANNO(node);


        // static: true || false, dynamic: undefined
        var leftBool = left.getStaticTruthValue(),
            rightBool = right.getStaticTruthValue(),
            operator = node.operator;

        if (operator === "||") {
            if (leftBool === false) {
                result.copyFrom(right);
                return;
            }
            if (leftBool === true) {
                result.copyFrom(left);
                return;
            }
            // Left is dynamic, let's check right
            if (rightBool === false) {
                // Now the result type is always the one of the left value
                result.copyFrom(left);
                return;
            }
        } else if (operator === "&&") {
            if (leftBool === false) {
                // T(x) == false => x && y == x
                result.copyFrom(left);
                return;
            }
            if (leftBool === true) {
                result.copyFrom(right);
                return;
            }
            // Left is dynamic, let's check right
            if (rightBool === true) {
                // Now the result type is always the one of the left value
                result.copyFrom(left);
                return;
            }
            if (rightBool === false) {
                // Now the result must be false
                result.setType(TYPES.BOOLEAN);
                result.setConstantValue(false);
                return;
            }
        }

        // If we can cast both sides to a common type, it's fine
        if (result.setCommonType(left, right)) {
            return;
        }
        result.setInvalid(generateErrorInformation(node, ERROR_TYPES.SHADEJS_ERROR, "Can't evaluate polymorphic logical expression"));
    },

    ConditionalExpression: function (node, parent, context) {
        var consequent = context.getTypeInfo(node.consequent),
            alternate = context.getTypeInfo(node.alternate),
            test = context.getTypeInfo(node.test),
            result = ANNO(node);

        var testResult = test.getStaticTruthValue();
        if (testResult === true) {
            result.copyFrom(consequent);
        } else if (testResult === false) {
            result.copyFrom(alternate);
        } else {
            if (result.setCommonType(consequent, alternate)) {
                result.setDynamicValue();
            } else {
                result.setInvalid(generateErrorInformation(node, ERROR_TYPES.SHADEJS_ERROR, "Can't evaluate polymorphic conditional expression"))
            }
        }

    }

};

module.exports = function (context, ast, propagatedConstants) {

    if (!ast)
        throw Error("No node to analyze");

    var controller = new estraverse.Controller();

    context.setConstants(propagatedConstants || null);

    controller.traverse(ast, {
        enter: function (node) {
            if (node.type == Syntax.VariableDeclaration) {
                context.setInDeclaration(true);
            }
        },
        leave: function (node, parent) {
            if (handlers.hasOwnProperty(node.type)) {
                return handlers[node.type].call(this, node, parent, context);
            }
            return null;
        }
    });

    context.setConstants(null);
};

(function (ns) {

    var common = require("./../../base/common.js"),
        Shade = require("../../interfaces.js"),
        evaluator = require("../constants/evaluator.js"),
        estraverse = require('estraverse'),
        assert = require('assert');

    var codegen = require('escodegen');

    var Syntax = common.Syntax,
        VisitorOption = common.VisitorOption,
        TYPES = Shade.TYPES,
        ANNO = common.ANNO;


    var debug = false;


    var exitExpression = function (context, node, parent) {
        var handlerName = "exit" + node.type;
        if (handlers.hasOwnProperty(handlerName)) {
            return handlers[handlerName].call(this, node, parent, context);
        }
    };

    function copyIfStatic (from, to, context) {
        var fromAnno = context.getTypeInfo(from), toAnno = context.getTypeInfo(to);
        if(!toAnno.isNullOrUndefined() && fromAnno.hasStaticValue()) {
            toAnno.setStaticValue(fromAnno.getStaticValue())
        }
        return toAnno;
    };

    var handlers = {

        /**
         * Literal: Compute static value
         */
        exitLiteral: function (node) {
            var result = ANNO(node);
            if (!result.isNull()) {
                result.setStaticValue(evaluator.getStaticValue(node));
            }
        },

        /**
         * ExpressionStatement: Just copy the result from the actual expression
         */
        exitExpressionStatement: function (node, parent, context) {
            copyIfStatic(node.expression, node, context);
        },


        /**
         * ReturnStatement:
         */
        exitReturnStatement: function (node, parent, context) {
            if(node.argument) {
                var result = copyIfStatic(node.argument, node, context);
                context.getScope().updateReturnInfo(result);
            }
        },

        /**
         * NewExpression: Find the type of the Callee from
         * the scope and evaluate based on annotated parameters
         */
        exitNewExpression: function (node, parent, context) {
            var result = ANNO(node);

            if(!result.isValid()) {
                return;
            }

            var scope = context.getScope();
            var entry = scope.getBindingByName(node.callee.name);
            if (entry && entry.hasConstructor()) {
                var staticValue,
                    constructor = entry.getConstructor();

                if (constructor.computeStaticValue) {
                    try {
                        staticValue = constructor.computeStaticValue(result, context.getTypeInfo(node.arguments), scope);
                        if (staticValue !== undefined) {
                            result.setStaticValue(staticValue);
                        }
                    } catch (e) {
                        result.setDynamicValue();
                    }
                } else {
                    debug && console.warn("No static evaluation exists for new ", node.callee.name);
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

            //noinspection FallthroughInSwitchStatementJS
            switch (operator) {
                case "!":
                    result.setType(TYPES.BOOLEAN);
                    if (argument.canObject()) {
                        result.setStaticValue(false); // !obj == false
                        return;
                    }
                    break;
                case "+":
                case "-":
                    break;
                case "~":
                case "typeof":
                case "void":
                case "delete":
                default:
                    return; // Not yet supported.
            }
            if (argument.hasStaticValue()) {
                result.setStaticValue(evaluator.getStaticValue(node));
            } else {
                result.setDynamicValue();
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

                    break;
                case "===":
                case "!==":
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

        exitAssignmentExpression: function (node, parent, context) {
            copyIfStatic(node.right, node, context);
        },


        exitMemberExpression: function (node, parent, context) {
            // console.warn("No static evaluation for member expressions yet", codegen.generate(node));
        },

        exitCallExpression: function (node, parent, context) {
            var result = ANNO(node),
                scope = context.getScope();

            // Call on an object, e.g. Math.cos()
            if (node.callee.type == Syntax.MemberExpression) {
                var callingObject = context.getTypeInfo(node.callee);
                var object = node.callee.object,
                    propertyName = node.callee.property.name;

                // Call a unknown function, we can't compute anything static
                if(!callingObject.isFunction()) {
                    return;
                }
                var objectReference = context.getTypeInfo(object);
                assert(objectReference);
                var objectInfo = scope.getObjectInfoFor(objectReference);
                assert(objectInfo);

                if (objectInfo.hasOwnProperty(propertyName)) {
                    var propertyHandler = objectInfo[propertyName];
                    if (typeof propertyHandler.computeStaticValue == "function") {
                        var args = context.getTypeInfo(node.arguments);
                        var staticValue = propertyHandler.computeStaticValue(result, args, scope, objectReference, context);
                        if(staticValue !== undefined) {
                            result.setStaticValue(staticValue);
                        }
                        return;
                    }
                    debug && console.warn("No static evaluation exists for function", codegen.generate(node));
                }
                return;

            }  else if (node.callee.type == Syntax.Identifier) {
                debug && console.warn("No static evaluation for function call yet", node.callee.name);
                return;
            }

            throw new Error("Unhandled CallExpression:" + node.callee.type);

        },

        exitVariableDeclarator: function (node, parent, context) {
            if(node.init) {
                copyIfStatic(node.init, node, context);
            }
        },


        enterVariableDeclaration: function (node, parent, context) {
            context.setInDeclaration(true);
        },

        exitVariableDeclaration: function (node, parent, context) {
            context.setInDeclaration(false);
        },



        enterLogicalExpression: function(node, parent, context) {
            var result = ANNO(node);

            context.inference(node.left);

            var left = context.getTypeInfo(node.left);
            var leftBool = left.getStaticTruthValue();

            if (leftBool == true && node.operator == "||") {
                return VisitorOption.Skip; // Don't evaluate right expression
            }
            if (leftBool == false && node.operator == "&&") {
                return VisitorOption.Skip; // Don't evaluate right expression
            }
            // In all other cases we also evaluate the right expression
            context.inference(node.right);
            this.skip();
        },




        enterConditionalExpression: function (node, parent, context) {
            var result = ANNO(node);

            context.inference(node.test);
            var test = context.getTypeInfo(node.test);

            // console.log(node.test, node.consequent, node.alternate);
            if (test.hasStaticValue() || test.canObject()) {
                var testResult = test.hasStaticValue() ? evaluateTruth(test.getStaticValue()) : true;
                if (testResult === true) {
                    context.inference(node.consequent);
                    consequent = context.getTypeInfo(node.consequent);
                    result.copy(consequent);
                    var alternate = ANNO(node.alternate);
                } else {
                    context.inference(node.alternate);
                    var alternate = context.getTypeInfo(node.alternate);
                    result.copy(alternate);
                    var consequent = ANNO(node.consequent);
                }
            } else {
                // We can't decide, thus traverse both;
                context.inference(node.consequent);
                context.inference(node.alternate);
                var consequent = context.getTypeInfo(node.consequent),
                    alternate = context.getTypeInfo(node.alternate);


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






        exitLogicalExpression: function (node, parent, context) {
            var left = context.getTypeInfo(node.left),
                right = context.getTypeInfo(node.right),
                result = ANNO(node),
                operator = node.operator;

            // static: true || false, dynamic: undefined
            var leftBool = left.getStaticTruthValue();
            var rightBool = right.getStaticTruthValue();

            if (operator === "||") {
                if (leftBool === false) {
                    result.copy(right);
                    return;
                }
                if (leftBool === true) {
                    result.copy(left);
                    return;
                }
                // Left is dynamic, let's check right
                if (rightBool === false) {
                    // Now the result type is always the one of the left value
                    result.copy(left);
                    return;
                }
            } else if (operator === "&&") {
                if (leftBool === false) {
                    // T(x) == false => x && y == x
                    result.copy(left);
                    return;
                }
                if (leftBool === true) {
                    result.copy(right);
                    return;
                }
                // Left is dynamic, let's check right
                if (rightBool === true) {
                    // Now the result type is always the one of the left value
                    result.copy(left);
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

        }

    };

    /**
     *
     * @param ast
     * @param propagatedConstants
     * @this {AnalysisContext}
     */
    ns.evaluate  = function(ast, propagatedConstants) {
        var controller = new estraverse.Controller();

        // console.log("Compute constants for", codegen.generate(ast), propagatedConstants)
        this.setConstants(propagatedConstants);

        controller.traverse(ast, {
            leave: exitExpression.bind(controller, this)
        })
        this.setConstants(null);

    }
}(exports));

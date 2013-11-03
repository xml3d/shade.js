(function (ns) {

    var common = require('../../base/common.js'),
        TYPES = require("../../interfaces.js").TYPES,
        FunctionAnnotation = require("./../../base/annotation.js").FunctionAnnotation;

    var VisitorOption = common.VisitorOption,
        Syntax = common.Syntax,
        ANNO = common.ANNO;

    var handler = {


        enterIfStatement: function (node, parent, context) {
            var result = ANNO(node);
            context.traverse(node.test);
            var test = ANNO(node.test);
            if (test.getStaticTruthValue() != undefined) { // Great! We can evaluate it!
                var testResult = test.getStaticTruthValue();
                test.setType(TYPES.BOOLEAN);
                test.setStaticValue(testResult);
                if (!testResult) {
                    if (node.alternate)
                        context.traverse(node.alternate);

                    var consequent = ANNO(node.consequent);
                    consequent.eliminate();
                } else {
                    context.traverse(node.consequent);
                    if (node.alternate) {
                        var alternate = ANNO(node.alternate);
                        alternate.eliminate();
                    }
                }
                return VisitorOption.Skip;
            }
        },



        /**
         * @param {Object} node
         * @param {Context} parentContext
         * @param {TypeInference} root
         */
        enterFunctionDeclaration: function (node, parent, context) {
            var result = new FunctionAnnotation(node);

            if (node.id.type != Syntax.Identifier) {
                throw new Error("Dynamic variable names are not yet supported");
            }
            var functionName = node.id.name;
            var functionContext = context.createContext(node, context.currentScope, functionName);
            functionContext.declareParameters(node.params);
            context.pushContext(functionContext);
            if (functionContext.str() != context.entryPoint) {
                return VisitorOption.Skip;
            }
        },

        /**
         * @param node
         * @param {Context} ctx
         * @param {TypeInference} root
         */
        exitFunctionDeclaration: function (node, parent, context) {
            var result = new FunctionAnnotation(node);
            var returnInfo = context.currentScope.getReturnInfo();
            result.setReturnInfo(returnInfo || { type: TYPES.UNDEFINED });
            context.popContext();
        },

        exitReturnStatement: function (node, parent, context) {
            var result = ANNO(node),
                argument = context.getTypeInfo(node.argument);

            if (argument) {
                result.copy(argument);
            } else {
                result.setType(TYPES.UNDEFINED);
            }
            context.currentScope.updateReturnInfo(result);
        },
        exitExpressionStatement: function (node, parent, context) {
            var result = ANNO(node),
                expression = ANNO(node.expression);

            result.copy(expression);
        }

    };


    var enterStatement = function (node, parent) {
        var handlerName = "enter" + node.type;
        if (handler.hasOwnProperty(handlerName)) {
            return handler[handlerName](node, parent, this);
        }
    };

    var exitStatement = function (node, parent) {
        var handlerName = "exit" + node.type;
        if (handler.hasOwnProperty(handlerName)) {
            return handler[handlerName](node, parent, this);
        }
    };

    ns.enterStatement = enterStatement;
    ns.exitStatement = exitStatement;
}(exports));

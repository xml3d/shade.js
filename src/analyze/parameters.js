(function (ns) {

    var walk = require('estraverse'),
        Scope = require("./../base/scope.js").getScope(null),
        resolver = require("../resolve/resolve.js"),
        Syntax = walk.Syntax;

    var derivedSystemParameters = {
        normalizedCoords: ["coords"],
        height: ["coords"],
        width: ["coords"]
    };


    /**
     *
     * @param {{shaderParameters: Array, systemParameters: Array}} result
     * @param {{shaderParameters: Array, systemParameters: Array}} other
     */
    function merge(result, other) {
        var i, param;
        for (var container in result) {
            for(i = 0; i < other[container].length; i++) {
                param = other[container][i];
                if (result[container].indexOf(param) == -1) {
                    result[container].push(param);
                }
            }
        }
    }

    function addSystemParameter(parameterName, container, parameterMap) {
        // Is parameter already in container?
        if (container.indexOf(parameterName) != -1)
            return;

        if (parameterMap && parameterMap.hasOwnProperty(parameterName)) {
            var requiredParameters = parameterMap[parameterName];
            requiredParameters.forEach(function (param) {
                addSystemParameter(param, container, parameterMap);
            });
            return;
        }
        container.push(parameterName);
    }

    /**
     * @param {string} functionName Global name of the function to analyze
     * @param {*} program AST of the program
     * @param {number} environmentObjectPosition
     * @param {object=} analyzedCalls
     * @returns {{shaderParameters: Array, systemParameters: Array}}
     */
    var findParametersInFunction = function (functionName, program, environmentObjectPosition, analyzedCalls) {
        var context = new Scope(program, null, {name: "global"});
        var contextStack = [context];

        var result = { shaderParameters: [], systemParameters: [] };
        analyzedCalls = analyzedCalls || {};
        // console.log("Looking for: ", functionName, environmentObjectPosition);

        var activeParam = null;

        var controller = new walk.Controller();
        controller.traverse(program, {
            enter: function (node) {
                var type = node.type,
                    context, retVal = null;
                switch (type) {
                    case Syntax.FunctionDeclaration:
                        var parentContext = contextStack[contextStack.length - 1];
                        parentContext.declareVariable(node.id.name, false);
                        context = new Scope(node, parentContext, {name: node.id.name });
                        contextStack.push(context);
                        if (context.str() == functionName) {
                            if (environmentObjectPosition != -1 && node.params.length > environmentObjectPosition) {
                                activeParam = node.params[environmentObjectPosition].name;
                            }
                        } else {
                            controller.skip();
                        }
                        break;
                    case Syntax.CallExpression:
                        var pos = node.arguments.reduce(function (prev, curr, index) {
                            if (curr.name && curr.name == activeParam)
                                return index;
                            return prev;
                        }, -1);
                        context = contextStack[contextStack.length - 1];
                        var id = context.getVariableIdentifier(node.callee.name);
                        if (id && !analyzedCalls[id]) {
                            analyzedCalls[id] = true;
                            merge(result, findParametersInFunction(id, program, pos, analyzedCalls));
                        }
                        break;
                    default:
                }
            },
            leave: function (node) {
                var type = node.type;
                switch (type) {
                    case Syntax.FunctionDeclaration:
                        contextStack.pop();
                        activeParam = null;
                        break;
                    case Syntax.MemberExpression:
                        var parameterName = node.property.name;
                        // In a specific parameter of the current method
                        if (activeParam && node.object.name == activeParam) {
                            addSystemParameter(parameterName, result.shaderParameters);
                        } // In 'this' is a system parameter
                        else if (node.object.type == Syntax.ThisExpression) {
                            addSystemParameter(parameterName, result.systemParameters, derivedSystemParameters);
                        } // In global variable '_env'
                        else if (node.object.name == "_env") {
                            addSystemParameter(parameterName, result.shaderParameters);
                        }
                        break;
                }
            }
        });

        return result;
    };

    /**
     * @param {object!} program
     * @param {object?} opt
     * @returns {{shaderParameters: Array, systemParameters: Array}}
     */
    ns.extractParameters = function (program, opt) {
        opt = opt || {};
        var functionName = opt.context || "global.shade";
        var parameterPosition = opt.param || 0;

        if(opt.implementation) {
            program = resolver.resolveClosures(program, opt.implementation, opt);
        }
        return findParametersInFunction(functionName, program, parameterPosition);
    };


}(exports));

(function (ns) {

    var walk = require('estraverse'),
        Context = require("./../base/context.js").getContext(null),
        resolver = require("../resolve/resolve.js"),
        Syntax = walk.Syntax;

    /**
     *
     * @param {{shaderParameters: Array, systemParameters: Array}} result
     * @param {{shaderParameters: Array, systemParameters: Array}} other
     */
    function merge(result, other) {
        result.shaderParameters = result.shaderParameters.concat(other.shaderParameters);
        result.systemParameters = result.systemParameters.concat(other.systemParameters);
    }

    /**
     * @param {string} functionName Global name of the function to analyze
     * @param {*} program AST of the program
     * @param {number} environmentObjectPosition
     * @param {object} analyzedCalls
     * @returns {{shaderParameters: Array, systemParameters: Array}}
     */
    var findParametersInFunction = function (functionName, program, environmentObjectPosition, analyzedCalls) {
        var context = new Context(program, null, {name: "global"})
        var contextStack = [context];

        var result = { shaderParameters: [], systemParameters: [] };
        analyzedCalls = analyzedCalls || {};
        // console.log("Looking for: ", functionName, environmentObjectPosition);

        var activeParam = null;
        walk.traverse(program, {
            enter: function (node) {
                var type = node.type,
                    context;
                switch (type) {
                    case Syntax.FunctionDeclaration:
                        var parentContext = contextStack[contextStack.length - 1];
                        parentContext.declareVariable(node.id.name, false);
                        context = new Context(node, parentContext, {name: node.id.name });
                        contextStack.push(context);
                        if (context.str() == functionName) {
                            if (environmentObjectPosition != -1 && node.params.length > environmentObjectPosition) {
                                activeParam = node.params[environmentObjectPosition].name;
                            }
                        } else {
                            return walk.VisitorOption.Skip;
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
                        if (activeParam && node.object.name == activeParam) {
                            if (result.shaderParameters.indexOf(parameterName) == -1)
                                result.shaderParameters.push(parameterName);
                        } else if (node.object.type == Syntax.ThisExpression) {
                            if (result.systemParameters.indexOf(parameterName) == -1)
                                result.systemParameters.push(parameterName);
                        } else if (node.object.name == "_env") {
                            if (result.shaderParameters.indexOf(parameterName) == -1)
                                result.shaderParameters.push(parameterName);
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

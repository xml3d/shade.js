(function (ns) {

    var walk = require('estraverse'),
        Context = require("./context.js").Context,
        Syntax = walk.Syntax;

    var findParametersInProgram = function (program, contextName, param) {
        var contextStack = [new Context(program, null, {name: "global"})];
        var foundParams = [];

        var activeParam = null;
        walk.traverse(program, {
            enter: function(node) {
                var type = node.type;
                switch(type) {
                    case Syntax.FunctionDeclaration:
                        var context = new Context(node, contextStack[contextStack.length-1], {name: node.id.name })
                        contextStack.push(context);
                        if(context.str() == contextName) {
                             if(node.params.length > param) {
                                 activeParam = node.params[param].name;
                                 console.log(activeParam);
                             }
                        }
                        break;
                }
                //console.log(node.type);
            },
            leave : function(node) {
                var type = node.type;
                switch(type) {
                    case Syntax.FunctionDeclaration:
                        contextStack.pop();
                        activeParam = null;
                        break;
                    case Syntax.MemberExpression:
                        if(activeParam && node.object.name == activeParam) {
                            var parameterName = node.property.name;
                            if (foundParams.indexOf(parameterName) == -1)
                                foundParams.push(parameterName);
                        }
                        break;
                }
            }
        })

        return foundParams;
    };

    /**
     * @param {object!} program
     * @param {object?} opt
     */
    var extractParameters = function (program, opt) {
        opt = opt || {};
        var context = opt.context || "global.shade";
        var param = opt.param || 0;

        return findParametersInProgram(program, context, param);
    };

    ns.extractParameters = extractParameters;

}(exports));

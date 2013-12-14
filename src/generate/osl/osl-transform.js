(function(ns){

    // Dependencies
    var Context = require("./registry/").OSLTransformContext,
        Tools = require("../tools.js"),
        common = require("../../base/common.js");

    var walk = require('estraverse'),
        AbstractTransformer = Tools.AbstractTransformer,
        ANNO = common.ANNO;

    // Shortcuts
    var Syntax = walk.Syntax;


    /**
     * @param program
     * @param options
     * @constructor
     */
    var OSLTransformer = function(program, options) {
        AbstractTransformer.call(this, program, options);
        this.context = new Context(program, "global.shade", options);
    };

    Tools.createClass(OSLTransformer, AbstractTransformer, {
        transform: function(ast) {
            var context = this.context,
                program = context.root,
                scope = context.createScope(program, null, "global"),
                name, declaration;

            scope.registerGlobals();
            context.pushScope(scope);

            //this.registerThisObject(scope);
            this.replace(program);
            return ast;
        },

        leave: function(node, parent, controller) {
            var context = this.context;
            switch(node.type) {
                case Syntax.FunctionDeclaration:
                    if(context.inMainFunction()) {
                        node.id.name = "main";
                        node.params = [];
                        for(var name in context.usedParameters) {
                              var typeInfo = context.usedParameters[name];
                              var param = {
                                  type: Syntax.Identifier,
                                  name: name,
                                  extra: typeInfo
                              }
                              node.params.push(param);
                        }
                    };
                    break;

                case Syntax.ReturnStatement:
                    if(context.inMainFunction()) {
                        this.leaveMainReturn(node)
                    }

            }
        },

        leaveMainReturn: function (node) {
            var context = this.context, closureResult;
            if (node.argument) {
                var argument = ANNO(node.argument);
                if (argument.isArray()) {
                    throw new Error("Not implemented yet");
                } else {
                    closureResult = {
                        type: Syntax.AssignmentExpression,
                        operator: "=",
                        left: {
                            type: Syntax.Identifier,
                            name: "result"
                        },
                        right: node.argument
                    };
                }
                return {
                    type: Syntax.BlockStatement,
                    body: [ closureResult, { type: Syntax.ReturnStatement } ]
                };
            } else {
                throw new Error("Not implemented yet");
            }
        },


    /**
     * @param {Object} node
     * @param {GLTransformContext} context
     * @returns {*}
     */
    enterFunctionDeclaration : function(node) {

        // Remove parameters of type undefined (these are not used anyway)
        node.params = node.params.filter(function(a) { return !ANNO(a).isUndefined()});
        return node;
    }

    });


    ns.transform = function(program, options) {
        var transformer = new OSLTransformer(program, options);
        return transformer.transform(program)
    };

}(exports));

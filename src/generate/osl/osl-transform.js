(function(ns){

    // Dependencies
    var OSLTransformContext = require("./registry/").OSLTransformContext,
        Tools = require("../tools.js"),
        AbstractTransformer = require("../base/base-transformer.js").AbstractTransformer,
        common = require("../../base/common.js"),
        ASTTools = require("../../base/asttools.js");

    var walk = require('estraverse'),
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
        this.context = new OSLTransformContext(program, "global.shade", Tools.extend(options,{
            blockedNames : ["N"]
        }));
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
                        return this.leaveMainReturn(node)
                    }
                    break;
                case Syntax.Identifier:
                    if(ASTTools.isVariableName(node, parent)) {
                        return this.leaveVariable(node);
                    } else {
                        if(node.name == "N")
                        console.log(node.name, node.type, parent.type);
                    }
                    break;

            }
        },

        leaveVariable: function(node) {
            var oldName = node.name;
            var newName = this.context.getVariableName(oldName);
            if(newName) {
                console.log("From map");
                node.name = newName;
                return node;
            }
            newName = this.context.getSafeName(oldName);
            if(newName != oldName) {
                node.name = newName;
                this.context.setVariableName(oldName, newName);
            }
            return node;
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

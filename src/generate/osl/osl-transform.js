(function(ns){

    // Dependencies
    var Tools = require("../tools.js");
    var AbstractTransformer = require("../base/base-transformer.js").AbstractTransformer;
    var common = require("../../base/common.js");
    var ASTTools = require("../../base/asttools.js");
    var Shade = require("./../../interfaces.js");

    var walk = require('estraverse'),
        ANNO = common.ANNO;

    // Shortcuts
    var Syntax = walk.Syntax;


    /**
     * @param program
     * @param options
     * @constructor
     */
    var OSLTransformer = function(program, context) {
        AbstractTransformer.call(this, program, context.options);
        this.context = context;
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
            this.vect2tovec3(program);
            return ast;
        },

        vect2tovec3: function(node) {
            walk.traverse(node, {
                enter: function(node) {
                    if(node.type == Syntax.NewExpression && ANNO(node).isOfKind(Shade.OBJECT_KINDS.FLOAT2)) {
                        if(node.arguments.length == 2) {
                            node.arguments.push({
                                type: Syntax.Literal,
                                value: 1
                            });
                        }
                    }
                }
            });
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
                    }
                    break;

                case Syntax.ReturnStatement:
                    if(context.inMainFunction()) {
                        return this.leaveMainReturn(node)
                    }
                    break;
                case Syntax.Identifier:
                    if(ASTTools.isVariableName(node, parent)) {
                        return this.leaveVariable(node);
                    }
                    break;

                case Syntax.BinaryExpression:
                    if(node.operator == "%") {
                        return Tools.binaryExpression2FunctionCall(node, "fmod");
                    }



            }
        },

        leaveVariable: function(node) {
            var oldName = node.name;
            var newName = this.context.getVariableName(oldName);
            if(newName) {
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
     * @returns {*}
     */
    enterFunctionDeclaration : function(node) {

        // Remove parameters of type undefined (these are not used anyway)
        node.params = node.params.filter(function(a) { return !ANNO(a).isUndefined()});
        return node;
    }

    });

    /**
     * @param {*} program
     * @param {OSLTransformContext} context
     * @returns {*}
     */
    ns.transform = function(program, context) {
        var transformer = new OSLTransformer(program, context);
        return transformer.transform(program);

    };

}(exports));

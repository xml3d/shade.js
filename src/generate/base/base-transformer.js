(function(ns){

   var Tools = require("../tools.js"),
       Shade = require("../../interfaces.js"),
       walker = require('estraverse'),
       common = require("../../base/common.js");

    var Syntax = walker.Syntax,
        ANNO = common.ANNO;

   var AbstractTransformer = function (program, options) {
        this.program = program;
        this.options = options || {};
    };

    Tools.extend(AbstractTransformer.prototype, {
        replace: function (ast) {
            var controller = new walker.Controller(), context = this.context, that = this;

            ast = controller.replace(ast, {

                enter: function (node, parent) {
                    if (node.type == Syntax.FunctionDeclaration) {
                        var scope = context.createScope(node, context.getScope(), node.id.name);
                        context.pushScope(scope);
                    }
                    return that.enter(node, parent, controller);
                },

                leave: function (node, parent) {
                    var result = that.leave(node, parent, controller);
                    if (result)
                        return result;

                    switch (node.type) {
                        case Syntax.FunctionDeclaration:
                            context.popScope();
                            break;
                        case Syntax.MemberExpression:
                            return that.leaveMemberExpression(node, parent, context);
                        case Syntax.NewExpression:
                            return that.leaveNewExpression(node, parent, context);
                        case Syntax.CallExpression:
                            return that.leaveCallExpression(node, parent, context);
                    }
                    return result;
                }
            });
            return ast;
        },
        leaveMemberExpression: function (node, parent, context) {
            var propertyName = node.property.name, scope = context.getScope();

            if (node.computed) {
                throw new Error("Not supported yet!");//return handleComputedMemberExpression(node, parent, context);
            }

            var objectReference = common.getTypeInfo(node.object, scope);

            if (!objectReference || !objectReference.isObject())
                Shade.throwError(node, "Internal Error: Object of Member expression is no object.");

            var objectInfo = scope.getObjectInfoFor(objectReference);
            if (!objectInfo) {// Every object needs an info, otherwise we did something wrong
                Shade.throwError(node, "Internal Error: No object registered for: " + objectReference.getTypeString() + JSON.stringify(node.object));
            }
            if (!objectInfo.hasOwnProperty(propertyName))
                Shade.throwError(node, "Internal Error: Object of type " + objectReference.getTypeString() + " has no property '" + propertyName + "'");

            var propertyHandler = objectInfo[propertyName];
            if (typeof propertyHandler.property == "function") {
                return propertyHandler.property(node, parent, scope, context);
            }

            if (objectReference.isGlobal()) {
                return context.createEnvironmentParameter(propertyName, ANNO(node));
            }
            if (node.object.type == Syntax.ThisExpression) {
                return context.createSystemParameter(propertyName, ANNO(node));
            }

        },
        leaveNewExpression : function(newExpression, parent, context){
            var scope = context.getScope();
            var entry = scope.getBindingByName(newExpression.callee.name);
            //console.error(entry);
            if (entry && entry.hasConstructor()) {
                var constructor = entry.getConstructor();
                return constructor(newExpression, parent);
            }
            else {
                throw new Error("ReferenceError: " + newExpression.callee.name + " is not defined");
            }
        },
        /**
         *
         * @param {object} node
         * @param {object} parent
         * @param {GLTransformContext} context
         * @returns {*}
         */
        leaveCallExpression: function (node, parent, context) {
            var scope = context.getScope();

            /** Filter out undefined arguments, we do the same for the declaration */
            node.arguments = node.arguments.filter(function (a) {
                return !ANNO(a).isUndefined()
            });

            // Is this a call on an object?
            if (node.callee.type == Syntax.MemberExpression) {
                var calleeReference = common.getTypeInfo(node.callee, scope);
                if (!(calleeReference && calleeReference.isFunction()))
                    Shade.throwError(node, "Something went wrong in type inference, " + node.callee.object.name);

                var object = node.callee.object, propertyName = node.callee.property.name;

                var objectReference = common.getTypeInfo(object, scope);
                if (!objectReference) {
                    Shade.throwError(node, "Internal: No type info for: " + object);
                }

                var objectInfo = scope.getObjectInfoFor(objectReference);
                if (!objectInfo) { // Every object needs an info, otherwise we did something wrong
                    Shade.throwError(node, "Internal Error: No object registered for: " + objectReference.getTypeString() + ", " + node.callee.object + ", " + node.callee.object.type);
                }
                if (objectInfo.hasOwnProperty(propertyName)) {
                    var propertyHandler = objectInfo[propertyName];
                    if (typeof propertyHandler.callExp == "function") {
                        var args = common.createTypeInfo(node.arguments, scope);
                        return propertyHandler.callExp(node, args, parent, context);
                    }
                }
            }
        },

        enter: function (node, parent, controller) {
        },
        leave: function (node, parent, controller) {
        }
    });

    ns.AbstractTransformer = AbstractTransformer;


}(exports));

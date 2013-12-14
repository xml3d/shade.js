(function (ns) {

    var Base = require("./../base/index.js"), walker = require('estraverse'), Context = require("../base/context.js"), Shade = require("./../interfaces.js"), common = require("../base/common.js"), Set = require("analyses").Set;

    // Shortcuts
    var Syntax = walker.Syntax, ANNO = common.ANNO;

    /**
     * Abstract code generator
     * @constructor
     */
    var AbstractGenerator = function (program, options) {
        this.program = program;
        this.options = options || {};
        this.lines = createLineStack();
    };

    Base.extend(AbstractGenerator.prototype, {
        traverse: function (ast) {
            var lines = this.lines, that = this;

            walker.traverse(ast, {
                enter: function (node, parent) {
                    var ret = that.enter(node, parent, this);
                    if (node.type == Syntax.FunctionDeclaration) {
                        lines.changeIndention(1);
                    }
                    return ret;
                },
                leave: function (node, parent) {
                    if (node.type == Syntax.FunctionDeclaration) {
                        lines.changeIndention(-1);
                    }
                    return that.leave(node, parent, this);
                }
            })
        },
        enter: function (node, parent, controller) {
        },
        leave: function (node, parent, controller) {
        }
    });


    var AbstractTransformer = function (program, options) {
        this.program = program;
        this.options = options || {};
    };

    Base.extend(AbstractTransformer.prototype, {
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
                    }
                    return result;
                }
            });
            return ast;
        },
        leaveMemberExpression: function (node, parent, context) {
            var propertyName = node.property.name, scope = context.getScope(), parameterName, propertyLiteral;

            if (node.computed) {
                return handleComputedMemberExpression(node, parent, context);
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

            var usedParameters = context.usedParameters;
            if (objectReference.isGlobal()) {
                return context.createEnvironmentParameter(propertyName, ANNO(node));
            }
            if (node.object.type == Syntax.ThisExpression) {
                return context.createSystemParameter(propertyName, ANNO(node));
            }

        },
        enter: function (node, parent, controller) {
        },
        leave: function (node, parent, controller) {
        }
    });


    var TransformContext = function (root, entry, opt) {
        Context.call(this, root, opt);
        this.usedParameters = {};
    };
    Base.createClass(TransformContext, Context, {
        addUsedParameter: function (name, typeInfo) {
            this.usedParameters[name] = typeInfo;
        }
    });


    function createLineStack() {
        var arr = [];
        arr.push.apply(arr, arguments);
        var indent = "";
        arr.appendLine = function (lines) {
            var args = Array.prototype.slice.call(arguments);
            args.forEach(function (line) {
                line ? arr.push(indent + line) : arr.push("");
            })

        };
        arr.changeIndention = function (add) {
            while (add > 0) {
                indent += "    ";
                add--;
            }
            if (add < 0) {
                indent = indent.substr(0, indent.length + add * 4);
            }
        };
        arr.append = function (str) {
            this[this.length - 1] = this[this.length - 1] + str;
        };
        return arr;
    };

    var generateFloat = function (value) {
        if (isNaN(value))
            throw Error("Internal: Expression generated NaN!");
        var result = '' + value;
        if (result.indexOf(".") == -1 && result.indexOf("e") == -1) {
            result += ".0";
        }
        return result;
    }

    /**
     *
     * @param controller
     * @param {object?} options
     * @constructor
     */
    var ExpressionHandler = function (controller, options) {
        this.controller = controller;
        this.controller.generateFloat = this.controller.generateFloat || generateFloat;
        this.options = options || {};
    };

    ExpressionHandler.prototype = {
        binary: function (node) {
            var result = this.expression(node);
            switch (node.type) {
                case Syntax.BinaryExpression:
                case Syntax.LogicalExpression:
                case Syntax.AssignmentExpression:
                    result = "( " + result + " )";
                    break;
            }
            return result;
        },
        arguments: function (container) {
            var result = "(";
            container.forEach(function (arg, index) {
                result += this.expression(arg);
                if (index < container.length - 1) {
                    result += ", ";
                }
            }, this);
            return result + ")";
        },
        literal: function (extra, alternative) {
            var value = extra.staticValue !== undefined ? extra.staticValue : alternative;
            if (extra.type == Shade.TYPES.NUMBER)
                return this.controller.generateFloat(value); else
                return value;
        },
        expression: function (node) {
            if (!node) return "";

            var result = "<unhandled: " + node.type + ">";

            switch (node.type) {
                case Syntax.NewExpression:
                    result = this.controller.type(node.extra);
                    result += this.arguments(node.arguments);
                    break;

                case Syntax.Literal:
                    result = this.literal(node.extra, node.value);
                    break;


                case Syntax.Identifier:
                    result = node.name;
                    break;

                case Syntax.BinaryExpression:
                case Syntax.LogicalExpression:
                case Syntax.AssignmentExpression:
                    result = this.binary(node.left);
                    result += " " + node.operator + " ";
                    result += this.binary(node.right);
                    break;
                case Syntax.UnaryExpression:
                    result = node.operator;
                    result += this.binary(node.argument);
                    break;

                case Syntax.CallExpression:
                    result = this.expression(node.callee);
                    result += this.arguments(node.arguments);
                    break;

                case Syntax.MemberExpression:
                    result = this.binary(node.object);
                    result += node.computed ? "[" : ".";
                    result += this.expression(node.property);
                    node.computed && (result += "]");
                    break;

                case Syntax.ConditionalExpression:
                    result = this.expression(node.test);
                    result += " ? ";
                    result += this.expression(node.consequent);
                    result += " : ";
                    result += this.expression(node.alternate);
                    break;

                case Syntax.UpdateExpression:
                    result = "";
                    if (node.isPrefix) {
                        result += node.operator;
                    }
                    result += this.expression(node.argument);
                    if (!node.isPrefix) {
                        result += node.operator;
                    }
                case Syntax.ExpressionStatement:
                    result = this.expression(node.expression);

                default:
                //console.log("Unhandled: " , node.type);
            }
            return result;
        },
        statement: function (node) {
            var result = "unhandled statement";
            switch (node.type) {
                case Syntax.ReturnStatement:
                    var hasArguments = node.argument;
                    result = "return" + (hasArguments ? (" " + this.expression(node.argument)) : "") + ";";
                    break;
            }
            return result;
        }
    }


    exports.AbstractGenerator = AbstractGenerator;
    exports.ExpressionHandler = ExpressionHandler;
    exports.AbstractTransformer = AbstractTransformer;
    exports.TransformContext = TransformContext;

    exports.createClass = Base.createClass;
    exports.extend = Base.extend;

}(exports))

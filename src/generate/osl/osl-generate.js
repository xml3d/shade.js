(function(ns){

    // Dependencies
    var Tools = require("../tools.js");
    var Syntax = require('estraverse').Syntax;
    var Shade = require("./../../interfaces.js");
    var AbstractGenerator = require("../base/base-generator.js").AbstractGenerator;
    var ExpressionHandler = require('../base/expression-handler.js').ExpressionHandler;
    var FunctionAnnotation = require("./../../type-system/annotation.js").FunctionAnnotation;


    // Shortcuts
    var Types = Shade.TYPES,
        Kinds = Shade.OBJECT_KINDS;


    function handleInlineDeclaration(node, opt) {
        if(!node)
            return "";
        if (node.type == Syntax.VariableDeclaration) {
            var result = node.declarations.reduce(function (declString, declaration) {
                var decl = toOSLType(declaration.extra) + " " + declaration.id.name;
                if (declaration.init) {
                    decl += " = " + handler.expression(declaration.init);
                }
                return declString + decl;
            }, "");
            return result;
        }

        // GLSL allows only declaration in init, but since this is a new scope, it should be fine
        if (node.type == Syntax.AssignmentExpression) {
            return toOSLType(node.extra) + " " + handler.expression(node.left) + " = " + handler.expression(node.right);
        }
        Shade.throwError(node, "Internal error in GLSL::handleInlineDeclaration, found " + node.type);
    }


    function getParameterInitializer(typeInfo) {
        if(!typeInfo) return "?";
        switch (typeInfo.type) {
            case Types.OBJECT:
                switch (typeInfo.kind) {
                    case Kinds.FLOAT4:
                        return "0";
                    case Kinds.FLOAT3:
                        return "0";
                    case Kinds.FLOAT2:
                        return "0";
                    case Kinds.TEXTURE:
                        return "\"\"";
                    case Kinds.MATRIX3:
                        return "?";
                    case Kinds.MATRIX4:
                        return "?";
                    case Kinds.COLOR_CLOSURE:
                        return "background";
                    default:
                        return "<undefined>";
                }
            case Types.ARRAY:
                return "array"

            case Types.UNDEFINED:
                    return "void";
            case Types.NUMBER:
                return "0";
            case Types.BOOLEAN:
                return "true";
            case Types.INT:
                return "0";
            default:
                //throw new Error("toGLSLType: Unhandled type: " + info.type);
                return info.type;

        }
    }

    var toOSLType = function(info, options) {
        if(!info) return "?";
        options = options || {};

        switch (info.type) {
            case Types.OBJECT:
                switch (info.kind) {
                    case Kinds.FLOAT4:
                        return "vector";
                    case Kinds.FLOAT3:
                        return "vector";
                    case Kinds.FLOAT2:
                        return "vector";
                    case Kinds.TEXTURE:
                        return "string";
                    case Kinds.MATRIX3:
                        return "mat3";
                    case Kinds.MATRIX4:
                        return "mat4";
                    case Kinds.COLOR_CLOSURE:
                        return "vec4";
                    default:
                        return "<undefined>";
                }
            case Types.ARRAY:
                return toOSLType(info.elements);

            case Types.UNDEFINED:
                if (allowUndefined)
                    return "void";
                throw new Error("Could not determine type");
            case Types.NUMBER:
                return "float";
            case Types.BOOLEAN:
                return "bool";
            case Types.INT:
                return "int";
            default:
                //throw new Error("toGLSLType: Unhandled type: " + info.type);
                return info.type;

        }
    }

    var handler = new ExpressionHandler( {
        type: toOSLType
    });


    /**
     * @param program
     * @param options
     * @constructor
     */
    var OSLGenerator = function(program, context) {
        AbstractGenerator.call(this, program, context.options);
        this.context = context;
    };

    var J = function(arr) {
        return arr.join(" ");
    }

    Tools.createClass(OSLGenerator, AbstractGenerator, {
        generate: function(ast) {
            var lines = this.lines;
            this.context.getNativeFunctions().forEach(function(func) {
                lines.appendLine(func);
            });

            this.traverse(ast);

            return lines.join("\n");;
        },
        enter: function(node, parent, controller) {
            var lines = this.lines;
            // console.log(node.type);
            switch(node.type) {
                case Syntax.FunctionDeclaration:
                    var func = new FunctionAnnotation(node);
                    var inMain = node.id.name == "main";
                    lines.appendLine(J([inMain? "shader" : toOSLType(func.getReturnInfo()), node.id.name, "("]));
                    lines.changeIndention(1);
                    node.params.forEach(function(param, index, arr) {
                        var result = [toOSLType(param.extra), param.name];
                        if(inMain) {
                            result.push( "=" , getParameterInitializer(param.extra));
                        }
                        lines.appendLine(J(result) + ((index < arr.length -1 || inMain) ? "," : ""));
                    });
                    inMain && lines.appendLine("output closure color result = 0");
                    lines.changeIndention(-1);
                    lines.appendLine(")", "{");
                    break;

                case Syntax.AssignmentExpression:
                case Syntax.ExpressionStatement:
                    lines.appendLine(handler.expression(node) + ";")
                    controller.skip();
                    break;

                case Syntax.ReturnStatement:
                    lines.appendLine(handler.statement(node));
                    break;

                case Syntax.VariableDeclarator:
                    lines.appendLine(J([toOSLType(node.extra), node.id.name + ";"]));
                    break;

                case Syntax.IfStatement:
                    controller.skip();
                    lines.appendLine("if(" + handler.expression(node.test) + ") {");

                    lines.changeIndention(1);
                    this.traverse(node.consequent);
                    lines.changeIndention(-1);

                    if (node.alternate) {
                        lines.appendLine("} else {");
                        lines.changeIndention(1);
                        this.traverse(node.alternate);
                        lines.changeIndention(-1);
                    }
                    lines.appendLine("}");
                    break;


                case Syntax.ForStatement:
                    controller.skip();
                    lines.appendLine("for (" + handleInlineDeclaration(node.init) + "; " + handler.expression(node.test) + "; " + handler.expression(node.update) + ") {");
                    lines.changeIndention(1);
                    this.traverse(node.body);
                    lines.changeIndention(-1);
                    lines.appendLine("}");
                    break;


                case Syntax.ContinueStatement:
                    lines.appendLine("continue;");

            }
        },
        leave: function(node, parent, controller) {
            var lines = this.lines;
            switch(node.type) {
                case Syntax.FunctionDeclaration:
                    lines.appendLine("}");
            }
        }

    });


    ns.generate = function(program, context) {
        var generator = new OSLGenerator(program, context);
        return generator.generate(program)
    };

}(exports));

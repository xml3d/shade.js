(function(ns){

    // Dependencies
    var Tools = require("../tools.js");
    var Syntax = require('estraverse').Syntax;
    var Shade = require("./../../interfaces.js");
    var AbstractGenerator = require("../base/base-generator.js").AbstractGenerator;
    var ExpressionHandler = require('../base/expression-handler.js').ExpressionHandler;


    // Shortcuts
    var Types = Shade.TYPES,
        Kinds = Shade.OBJECT_KINDS;


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

    var toOSLType = function(info) {
        if(!info) return "?";

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
    var OSLGenerator = function(program, options) {
        AbstractGenerator.call(this, program, options);

    };

    var J = function(arr) {
        return arr.join(" ");
    }

    Tools.createClass(OSLGenerator, AbstractGenerator, {
        generate: function(ast) {

            this.traverse(ast);

            return this.lines.join("\n");;
        },
        enter: function(node, parent, controller) {
            var lines = this.lines;
            // console.log(node.type);
            switch(node.type) {
                case Syntax.FunctionDeclaration:
                    lines.appendLine(J(["shader", node.id.name, "("]));
                    lines.changeIndention(1);
                    node.params.forEach(function(param) {
                        lines.appendLine(J([toOSLType(param.extra), param.name , "=" , getParameterInitializer(param.extra)])+",");
                    });
                    lines.appendLine("output closure color result = 0");
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


    ns.generate = function(program, options) {
        var generator = new OSLGenerator(program, options);
        return generator.generate(program)
    };

}(exports));

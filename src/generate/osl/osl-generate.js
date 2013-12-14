(function(ns){

    // Dependencies
    var Tools = require("../tools.js");
    var Syntax = require('estraverse').Syntax;
    var Shade = require("./../../interfaces.js");


    // Shortcuts
    var AbstractGenerator = Tools.AbstractGenerator,
        Types = Shade.TYPES,
        Kinds = Shade.OBJECT_KINDS;


    var toOSLType = function(info) {
        if(!info) return "?";

        switch (info.type) {
            case Types.OBJECT:
                switch (info.kind) {
                    case Kinds.FLOAT4:
                        return "vec4";
                    case Kinds.FLOAT3:
                        return "color";
                    case Kinds.FLOAT2:
                        return "vector";
                    case Kinds.TEXTURE:
                        return "sampler2D";
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

    var handler = new Tools.ExpressionHandler( {
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
                        lines.appendLine(J([toOSLType(param.extra), param.name + ","]));
                    });
                    lines.appendLine("output closure color result = 0");
                    lines.changeIndention(-1);
                    lines.appendLine(")", "{");
                    break;
                case Syntax.ExpressionStatement:
                case Syntax.AssignmentExpression:
                    lines.appendLine(handler.expression(node) + ";")
                    controller.skip();
                    break;
                case Syntax.ReturnStatement:
                    lines.appendLine(handler.statement(node));

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

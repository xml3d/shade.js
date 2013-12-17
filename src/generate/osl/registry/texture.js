(function(ns){

    var Shade = require("../../../interfaces.js");
    var common = require("../../../base/common.js");
    var Tools = require("../../tools.js");
    var OSLTools = require("./osl-tools.js");

    var Syntax = common.Syntax;

    var TextureInstance = {
        sample2D: {
            callExp: function(node) {
                var call = Tools.Vec.createFunctionCall('texture', 0, node);
                call.arguments.push(OSLTools.Vec.createArrayAccess(node.arguments[0], 0));
                call.arguments.push(OSLTools.Vec.createArrayAccess(node.arguments[0], 1));
                call.arguments.push({ type: Syntax.Literal, value: "\"wrap\""});
                call.arguments.push({ type: Syntax.Literal, value: "\"periodic\""});
                return call;
            }
        },
        width: {
            property: function (node, parent, context, state) {
                var parameterName = node.object.name;
                node.property.name = parameterName + "_width";
                state.usedParameters.shader[parameterName + "_width"] = {
                    type: Shade.TYPES.INT,
                    kind: Shade.OBJECT_KINDS.INT,
                    source: Shade.SOURCES.UNIFORM
                };
                return node.property;
            }
        },
        height: {
            property: function (node, parent, context, state) {
                var parameterName = node.object.name;
                node.property.name = parameterName + "_height";
                state.usedParameters.shader[parameterName + "_height"] = {
                    type: Shade.TYPES.INT,
                    kind: Shade.OBJECT_KINDS.INT,
                    source: Shade.SOURCES.UNIFORM
                };
                return node.property;
            }
        }
    }

    Tools.extend(ns, {
        id: "Texture",
        kind: Shade.OBJECT_KINDS.TEXTURE,
        object: {
            constructor: null,
            static: {}
        },
        instance: TextureInstance
    });

}(exports));

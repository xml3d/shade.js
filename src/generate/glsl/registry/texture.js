(function(ns){

    var Shade = require("../../../interfaces.js");
    var Syntax = require('estraverse').Syntax;
    var Tools = require("./tools.js");
    var ANNO = require("../../../base/annotation.js").ANNO;

    var TYPES = Shade.TYPES,
        KINDS = Shade.OBJECT_KINDS;

    var TextureInstance = {
        sample2D: {
            callExp: Tools.Vec.createFunctionCall.bind(null, 'texture2D', 2)
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
        kind: KINDS.TEXTURE,
        object: {
            constructor: null,
            static: {}
        },
        instance: TextureInstance
    });

}(exports));

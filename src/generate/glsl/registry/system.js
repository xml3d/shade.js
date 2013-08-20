(function (ns) {

    var Base = require("../../../base/index.js"),
        Shade = require("../../../interfaces.js");

    var SystemParameterNames = {
        "normalizedCoords" : "_sys_normalizedCoords",
        "height": "_sys_height",
        "width": "_sys_width"
    }

    var SystemEntry = {
        coords: {
            property: function (node) {
                node.property.name = "gl_FragCoord";
                return node.property;
            }
        },
        normalizedCoords: {
            property: function (node, parent, context, state) {
                state.globalParameters[SystemParameterNames.normalizedCoords] = {
                    type: Shade.TYPES.OBJECT,
                    kind: Shade.OBJECT_KINDS.FLOAT3,
                    source: Shade.SOURCES.UNIFORM
                }
                node.property.name = SystemParameterNames.normalizedCoords;
                return node.property;
            }
        },
        height: {
            property: function (node, parent, context, state) {
                state.globalParameters[SystemParameterNames.height] = {
                    type: Shade.TYPES.NUMBER,
                    source: Shade.SOURCES.UNIFORM
                }
                node.property.name = SystemParameterNames.height;
                return node.property;
            }
        },
        width: {
            property: function (node, parent, context, state) {
                state.globalParameters[SystemParameterNames.width] = {
                    type: Shade.TYPES.NUMBER,
                    source: Shade.SOURCES.UNIFORM
                }
                node.property.name = SystemParameterNames.width;
                return node.property;
            }
        }

    };

    Base.extend(ns, {
        id: "System",
        object: {
            constructor: null,
            static: SystemEntry
        },
        instance: null
    });
}(exports));

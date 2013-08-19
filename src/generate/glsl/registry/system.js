(function (ns) {

    var Base = require("../../../base/index.js");

    var SystemEntry = {
        coords: {
            property: function (node) {
                node.property.name = "gl_FragCoord";
                return node.property;
            }
        },
        normalizedCoords: {
            property: function (node) {
                node.property.name = "__sys_normalizedCoords";
                return node.property;
            }
        },
        height: {
            property: function (node) {
                node.property.name = "__sys_height";
                return node.property;
            }
        },
        width: {
            property: function (node) {
                node.property.name = "__sys_width";
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

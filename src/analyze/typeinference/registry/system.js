(function(ns){

    var Shade = require("../../../interfaces.js"),
        TYPES = Shade.TYPES,
        KINDS = Shade.OBJECT_KINDS,
        Base = require("../../../base/index.js");

    var SystemObject = {
        coords: {
            type: TYPES.OBJECT,
            kind: KINDS.FLOAT3
        },
        normalizedCoords: {
            type: TYPES.OBJECT,
            kind: KINDS.FLOAT3
        }
    };

    Base.extend(ns, {
        id: "System",
        object: {
            constructor: null,
            static: SystemObject
        },
        instance: null
    });

}(exports));

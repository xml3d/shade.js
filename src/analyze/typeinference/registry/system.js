(function(ns){

    var Shade = require("../../../interfaces.js"),
        TYPES = Shade.TYPES,
        KINDS = Shade.OBJECT_KINDS,
        Base = require("../../../base/index.js");

    /**
     * Derived parameters: These exist in the system for convenience,
     * but can be derived from other system parameters
     */
    var DerivedParameterInformation = {
        normalizedCoords: {
            type: TYPES.OBJECT,
            kind: KINDS.FLOAT3,
            derived: true
        },
        height: {
            type: TYPES.INT,
            derived: true
        },
        width: {
            type: TYPES.INT,
            derived: true
        }

    };

    Base.extend(ns, {
        id: "System",
        object: {
            constructor: null,
            static: DerivedParameterInformation
        },
        instance: null,
        derivedParameters: DerivedParameterInformation
    });

}(exports));

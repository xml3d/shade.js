(function(ns){

    var Shade = require("../../../interfaces.js"),
        TYPES = Shade.TYPES,
        KINDS = Shade.OBJECT_KINDS,
        Base = require("../../../base/index.js"),
        Tools = require("./tools.js");

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

    var OptionalMethods = {
        fwidth: {
            type: TYPES.FUNCTION,
            evaluate: function (result, args) {
                Tools.checkParamCount(result.node, "fwidth", [1], args.length);
                var arg = args[0];
                if (arg.canNumber()) {
                    return {
                        type: arg.getType()
                    }
                }
                if (arg.isVector()) {
                    return {
                        type: TYPES.OBJECT,
                        kind: arg.getKind()
                    }
                }
                Shade.throwError(result.node, "IllegalArgumentError: first argument of this.fwidth is of type: " + arg.getTypeString());
            }
        }
    };



    Base.extend(ns, {
        id: "System",
        object: {
            constructor: null,
            static: DerivedParameterInformation
        },
        instance: null,
        derivedParameters: DerivedParameterInformation,
        optionalMethods: OptionalMethods
    });

}(exports));

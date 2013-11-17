(function(ns){

    var Shade = require("../../../interfaces.js"),
        Base = require("../../../base/index.js"),
        Annotations = require("../../../base/annotation.js"),
        Tools = require("./tools.js");

    var TYPES = Shade.TYPES,
        KINDS = Shade.OBJECT_KINDS,
        ANNO = Annotations.ANNO;


    /**
     * Derived parameters: These exist in the system for convenience,
     * but can be derived from other system parameters
     */
    var DerivedCanvasProperties = {
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

    ns.getThisTypeInfo = function(systemInfo) {
        var thisAnnotation = ANNO({}, systemInfo);
        // Add those parameters that can be calculated from system inputs
        var objectInfo = thisAnnotation.getNodeInfo();

        if(objectInfo && objectInfo.hasOwnProperty("coords")) {
            Base.extend(objectInfo, DerivedCanvasProperties);
        }

        return thisAnnotation;
    }



}(exports));

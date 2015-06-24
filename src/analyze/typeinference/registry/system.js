(function(ns){

    var Shade = require("../../../interfaces.js"),
        Base = require("../../../base/index.js"),
        Annotations = require("../../../type-system/annotation.js"),
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

    function allowNumberOrVector(name) {
        return function(result, args) {
           Tools.checkParamCount(result.node, name, [1], args.length);
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
                Shade.throwError(result.node, "IllegalArgumentError: first argument of this." + name + " is of type: " + arg.getTypeString());
        }
    }


    var OptionalMethods = {
        fwidth: {
            type: TYPES.FUNCTION,
            evaluate: allowNumberOrVector("fwidth")
        },
        dx: {
            type: TYPES.FUNCTION,
            evaluate: allowNumberOrVector("dx")
        },
        dy: {
            type: TYPES.FUNCTION,
            evaluate: allowNumberOrVector("dy")
        }
    };

    ns.getThisTypeInfo = function(systemInfo) {
        systemInfo = systemInfo || { type: TYPES.OBJECT, kind: KINDS.ANY, info: {}};
        var thisAnnotation = ANNO({}, systemInfo);
        // Add those parameters that can be calculated from system inputs
        var objectInfo = thisAnnotation.getNodeInfo();
        if (!objectInfo) {
            objectInfo = {};
            thisAnnotation.setNodeInfo(objectInfo);
        }

        if(objectInfo.hasOwnProperty("coords")) {
            Base.extend(objectInfo, DerivedCanvasProperties);
        }
        for(var entry in OptionalMethods) {
            if(objectInfo.hasOwnProperty(entry)) {
                Base.extend(objectInfo[entry], OptionalMethods[entry])
            }
        }

        return thisAnnotation;
    }



}(exports));

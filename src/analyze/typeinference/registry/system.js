var Shade = require("../../../interfaces.js"),
    Base = require("../../../base/index.js"),
    Annotations = require("../../../type-system/annotation.js"),
    Tools = require("./tools.js");
var TypeInfo = require("../../../type-system/typeinfo.js").TypeInfo;


var TYPES = Shade.TYPES,
    KINDS = Shade.OBJECT_KINDS,
    ANNO = Annotations.ANNO;


function allowNumberOrVector(name) {
    return function (result, args) {
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

module.exports = {
    name: "System",
    properties: {
        normalizedCoords: {
            type: TYPES.OBJECT,
            kind: "Vec3",
            derived: true
        },
        coords: {
            type: TYPES.OBJECT,
            kind: "Vec3",
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
    }
};

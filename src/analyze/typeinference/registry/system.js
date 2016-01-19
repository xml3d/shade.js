var Shade = require("../../../interfaces.js"),
    Base = require("../../../base/index.js"),
    Annotations = require("../../../type-system/annotation.js"),
    Tools = require("./tools.js");
var TypeInfo = require("../../../type-system/typeinfo.js").TypeInfo;


var TYPES = Shade.TYPES,
    KINDS = Shade.OBJECT_KINDS,
    ANNO = Annotations.ANNO;


function allowNumberOrVector(name) {
    return function (node, args) {
        Tools.checkParamCount(node, name, [1], args.length);
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
        Shade.throwError(node, "IllegalArgumentError: first argument of this." + name + " is of type: " + arg.getTypeString());
    }
}


var DerivativesMethods = {
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

var System = {
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
    },
    setDerivatives: function (available) {
        if (available) {
            Base.extend(System.properties, DerivativesMethods);
        } else {
            for (var methodName in DerivativesMethods) {
                delete System.properties[methodName];
            }
        }
    }
};

module.exports = System;

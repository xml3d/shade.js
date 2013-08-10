(function (ns) {

    var interfaces = require("../../../interfaces.js"),
    Tools = require("./tools.js");

    var TYPES = interfaces.TYPES,
        KINDS = interfaces.OBJECT_KINDS;

    var MatrixInstance = {
        transformPoint: {
            type: TYPES.UNDEFINED,
            evaluate: function(result, args) {
                Tools.checkParamCount(result.node, "Matrix::transformPoint", [1,2], args.length);
                var sourcePoint = targetPoint = args[0];
                if (!(sourcePoint.isObject() && sourcePoint.canNormal())) {
                    throw new Error("First argument of Matrix::transformPoint must evaluate to a point, found: " + sourcePoint.getTypeString());
                }


            }
        }
    }

    Tools.extend(ns, {
        id: "Matrix4",
        kind: "matrix4",
        object: {
            constructor: null,
            static: null
        },
        instance: MatrixInstance
    });

}(exports));

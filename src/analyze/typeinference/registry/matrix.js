(function (ns) {

    var interfaces = require("../../../interfaces.js"),
    Base = require("../../../base/index.js");

    var TYPES = interfaces.TYPES,
        KINDS = interfaces.OBJECT_KINDS;

    var MatrixInstance = {
        multiplyPoint: {
            type: TYPES.OBJECT,
            kind: KINDS.FLOAT3,
            evaluate: function() {
                console.log("EVAL");
            }
        }
    }

    Base.extend(ns, {
        id: "Matrix4",
        kind: "matrix4",
        object: {
            constructor: null,
            static: null
        },
        instance: MatrixInstance
    });

}(exports));

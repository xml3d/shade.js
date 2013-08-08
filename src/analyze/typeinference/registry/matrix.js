(function (ns) {

    var interfaces = require("../../../interfaces.js");

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


    exports.instance = MatrixInstance;
}(exports));

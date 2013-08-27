(function(ns){

    var Shade = require("../../../interfaces.js");
    var Syntax = require('estraverse').Syntax;
    var Tools = require("./tools.js");
    var ANNO = require("../../../base/annotation.js").ANNO;

    var TYPES = Shade.TYPES,
        KINDS = Shade.OBJECT_KINDS;

    var Mat3Instance = {
        col: {
            callExp: Tools.Mat.generateColCall.bind(null, "Mat3")
        }
    }
    Tools.Mat.attachOperators(Mat3Instance, "Mat3", {
        add: '+',
        sub: '-',
        mul: '*',
        div: '/'
    });
    Tools.Vec.attachOperators(Mat3Instance, 3, {
        mulVec: '*'
    });


    Tools.extend(ns, {
        id: "Mat3",
        kind: KINDS.MATRIX3,
        object: {
            constructor: Tools.Vec.generateConstructor,
            static: {}
        },
        instance: Mat3Instance
    });

}(exports));

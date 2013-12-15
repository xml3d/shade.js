(function(ns){

    var Shade = require("../../../interfaces.js");
    var Syntax = require('estraverse').Syntax;
    var Tools = require("../../tools.js");
    var ANNO = require("../../../base/annotation.js").ANNO;

    var TYPES = Shade.TYPES,
        KINDS = Shade.OBJECT_KINDS;

    var Mat4Instance = {
        col: {
            callExp: Tools.Mat.generateColCall.bind(null, "Mat4")
        }
    }
    Tools.Mat.attachOperators(Mat4Instance, "Mat4", {
        add: '+',
        sub: '-',
        mul: '*',
        div: '/'
    });
    Tools.Vec.attachOperators(Mat4Instance, 4, {
        mulVec: '*'
    });


    Tools.extend(ns, {
        id: "Mat4",
        kind: KINDS.MATRIX4,
        object: {
            constructor: Tools.Vec.generateConstructor,
            static: {}
        },
        instance: Mat4Instance
    });

}(exports));

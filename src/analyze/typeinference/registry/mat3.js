(function(ns){

    var Shade = require("../../../interfaces.js"),
        TYPES = Shade.TYPES,
        KINDS = Shade.OBJECT_KINDS,
        Tools = require("./tools.js");

    var Matrix3Constructor =  {
        type: TYPES.OBJECT,
        kind: KINDS.MATRIX3,
        /**
         * @param {Annotation} result
         * @param {Array.<Annotation>} args
         * @param {Context} ctx
         */
        evaluate: Tools.Mat.matConstructorEvaluate.bind(null, 3)
    };

    var Matrix3StaticObject = {
       col: {
            type: TYPES.FUNCTION,
            evaluate: Tools.Mat.colEvaluate.bind(null,"Mat3")
       }
    };

    var Matrix3Instance = {
    };
    Tools.Mat.attachMatMethods(Matrix3Instance, "Mat3", ['add', 'sub', 'mul', 'div']);
    Tools.Vec.attachVecMethods(Matrix3Instance, "Mat3", 3, 3, ['mulVec']);


    Tools.extend(ns, {
        id: "Mat3",
        kind: KINDS.MATRIX3,
        object: {
            constructor: Matrix3Constructor,
            static: Matrix3StaticObject
        },
        instance: Matrix3Instance
    });


}(exports));

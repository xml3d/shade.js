(function(ns){

    var Shade = require("../../../interfaces.js"),
        TYPES = Shade.TYPES,
        KINDS = Shade.OBJECT_KINDS,
        Tools = require("./tools.js");

    var Matrix4Constructor =  {
        type: TYPES.OBJECT,
        kind: KINDS.MATRIX4,
        /**
         * @param {Annotation} result
         * @param {Array.<Annotation>} args
         * @param {Context} ctx
         */
        evaluate: Tools.Mat.matConstructorEvaluate.bind(null, "Mat4")
    };

    var Matrix4StaticObject = {
    };

    var Matrix4Instance = {
        col: {
            type: TYPES.FUNCTION,
            evaluate: Tools.Mat.colEvaluate.bind(null, "Mat4")
        }
    };
    Tools.Mat.attachMatMethods(Matrix4Instance, "Mat4", ['add', 'sub', 'mul', 'div']);
    Tools.Vec.attachVecMethods(Matrix4Instance, "Mat4", 4, 4, ['mulVec']);


    Tools.extend(ns, {
        id: "Mat4",
        kind: KINDS.MATRIX4,
        object: {
            constructor: Matrix4Constructor,
            static: Matrix4StaticObject
        },
        instance: Matrix4Instance
    });


}(exports));

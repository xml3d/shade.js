(function(ns){

    var Shade = require("../../../interfaces.js"),
        TYPES = Shade.TYPES,
        KINDS = Shade.OBJECT_KINDS,
        Tools = require("./tools.js");

    var Vector4Constructor =  {
        type: TYPES.OBJECT,
        kind: KINDS.FLOAT4,
        /**
         * @param {Annotation} result
         * @param {Array.<Annotation>} args
         * @param {Context} ctx
         */
        evaluate: Tools.Vec.constructorEvaluate.bind(null, "Vec4", false, 4)
    };

    var Vector4StaticObject = {
    };

    var Vector4Instance = {
        length: {
            type: TYPES.FUNCTION,
            evaluate: Tools.Vec.optionalZeroEvaluate.bind(null,"Vec4", false, "length", 4, 1, 1)
        }
    };
    Tools.Vec.attachSwizzles(Vector4Instance, "Vec4", false, 4);
    Tools.Vec.attachVecMethods(Vector4Instance, "Vec4", false, 4, 4, ['add', 'sub', 'mul', 'div', 'mod']);
    Tools.Vec.attachVecMethods(Vector4Instance, "Vec4", false, 4, 0, ['normalize']);


    Tools.extend(ns, {
        id: "Vec4",
        kind: KINDS.FLOAT4,
        object: {
            constructor: Vector4Constructor,
            static: Vector4StaticObject
        },
        instance: Vector4Instance
    });


}(exports));

(function(ns){

    var Shade = require("../../../interfaces.js"),
        TYPES = Shade.TYPES,
        KINDS = Shade.OBJECT_KINDS,
        Tools = require("./tools.js");

    var Vector2Constructor =  {
        type: TYPES.OBJECT,
        kind: KINDS.FLOAT2,
        /**
         * @param {Annotation} result
         * @param {Array.<Annotation>} args
         * @param {Context} ctx
         */
        evaluate: Tools.Vec.constructorEvaluate.bind(null, "Vec2", 2),
        computeStaticValue: Tools.Vec.constructorComputeStaticValue.bind(null, "Vec2")
    };

    var Vector2StaticObject = {
    };

    var Vector2Instance = {
        length: {
            type: TYPES.FUNCTION,
            evaluate: Tools.Vec.optionalZeroEvaluate.bind(null,"Vec2", "length", 2, 1, 1)
        }
    };
    Tools.Vec.attachSwizzles(Vector2Instance, "Vec2", 2);
    Tools.Vec.attachVecMethods(Vector2Instance, "Vec2", 2, 2, ['add', 'sub', 'mul', 'div', 'mod', 'reflect']);
    Tools.Vec.attachVecMethods(Vector2Instance, "Vec2", 1, 2, ['dot']);
    Tools.Vec.attachVecMethods(Vector2Instance, "Vec2", 2, 0, ['normalize', 'flip']);


    Tools.extend(ns, {
        id: "Vec2",
        kind: KINDS.FLOAT2,
        object: {
            constructor: Vector2Constructor,
            static: Vector2StaticObject
        },
        instance: Vector2Instance
    });


}(exports));

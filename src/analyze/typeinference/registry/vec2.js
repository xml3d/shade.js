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
        evaluate: function(result, args, ctx) {
            Tools.Vec.checkVecArguments("Vec2", false, 2, true, result, args);
            var argArray = [];
            var isStatic = true;
            args.forEach(function (param, index) {
                isStatic = isStatic && param.hasStaticValue();
                if (isStatic)
                    argArray.push(param.getStaticValue());
            });

            var typeInfo = {
                type: TYPES.OBJECT,
                kind: KINDS.FLOAT2
            }

            if (isStatic) {
                var v = new Shade.Vec2();
                Shade.Vec2.apply(v, argArray);
                typeInfo.staticValue = v;
            }
            return typeInfo;
        }
    };

    var Vector2StaticObject = {
    };

    var Vector2Instance = {
        length: {
            type: TYPES.FUNCTION,
            evaluate: Tools.Vec.optionalZeroEvaluate.bind(null,"Vec2", false, "length", 2, 1, 1)
        }
    };
    Tools.Vec.attachSwizzles(Vector2Instance, "Vec2", false, 2);
    Tools.Vec.attachVecMethods(Vector2Instance, "Vec2", false, 2, 2, ['add', 'sub', 'mul', 'div', 'mod']);
    Tools.Vec.attachVecMethods(Vector2Instance, "Vec2", false, 2, 0, ['normalize']);


    Tools.extend(ns, {
        id: "Vec2",
        kind: "float2",
        object: {
            constructor: Vector2Constructor,
            static: Vector2StaticObject
        },
        instance: Vector2Instance
    });


}(exports));

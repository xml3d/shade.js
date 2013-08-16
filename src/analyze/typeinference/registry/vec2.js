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
            Tools.Vec.checkVecArguments("Vec2", 2, true, result, args);
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
        add: {
            type: TYPES.FUNCTION,
            evaluate: function (result, args, ctx, callObject) {
                return Tools.Vec.vecEvaluate("Vec2", "add", 3, 2, result, args, ctx, callObject);
            }
        },
        sub: {
            type: TYPES.FUNCTION,
            evaluate: function (result, args, ctx, callObject) {
                return Tools.Vec.vecEvaluate("Vec2", "sub", 3, 2, result, args, ctx, callObject);
            }
        }
    };
    Tools.Vec.attachSwizzles(Vector2Instance, "Vec2", 2);


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

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
            Tools.checkParamCount(result.node, "Vec2()", [0, 1, 2], args.length);
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

    const VEC2TYPE = { type: TYPES.OBJECT, kind: KINDS.FLOAT2 };

    var Vector2StaticObject = {
    };

    var getStaticValue = function(index) {
        return function(vec2, args) {
            return vec2[index];
        }
    }

    var Vector2Instance = {
        x: Tools.singleAccessor("Vec.x", VEC2TYPE, [0, 1], getStaticValue(0)),
        y: Tools.singleAccessor("Vec.y", VEC2TYPE, [0, 1], getStaticValue(1)),
        yx: Tools.Vec.getSwizzleEvaluate("Vec2", 2, "yx"),
        xy: {
            type: TYPES.FUNCTION,
            evaluate: function (result, args) {
                Tools.checkParamCount(result.node, "Vec2.xy", [0, 1, 2], args.length);
                // TODO: Check arg parameters
                var typeInfo = {};
                Tools.extend(typeInfo, VEC2TYPE);
                return typeInfo;
            }
        },
        add: {
            type: TYPES.FUNCTION,
            evaluate: function (result, args) {
                var name = "Vec2.add";
                Tools.checkParamCount(result.node, name, [0, 1, 2], args.length);
                switch (args.length) {
                    case 0:   // Is this valid?
                        break;
                    case 1:
                        if(!(args[0].canNumber() || args[0].equals(VEC2TYPE))) {
                            Shade.throwError(result.node, "Expected number or Vec2 as first argument of " + name);
                        }
                        break;
                    case 2:
                        if(!(args[0].canNumber() && args[1].canNumber())) {
                            Shade.throwError(result.node, "Expected number as first and second argument of " + name);
                        }
                        break;
                }
                var typeInfo = {};
                Tools.extend(typeInfo, VEC2TYPE);
                return typeInfo;

            }
        },
        sub: {
            type: TYPES.FUNCTION,
            evaluate: function (result, args) {
                Tools.checkParamCount(result.node, "Vec2.sub", [0, 1, 2], args.length);
                // TODO: Check arg parameters
                var typeInfo = {};
                Tools.extend(typeInfo, VEC2TYPE);
                return typeInfo;
            }
        }


    };


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

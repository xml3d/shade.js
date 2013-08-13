(function(ns){

    var Shade = require("../../../interfaces.js"),
        TYPES = Shade.TYPES,
        KINDS = Shade.OBJECT_KINDS,
        Base = require("../../../base/index.js"),
        Tools = require("./tools.js");

    var Vec3Constructor =  {
        type: TYPES.OBJECT,
        kind: KINDS.FLOAT3,
        /**
         * @param {Annotation} result
         * @param {Array.<Annotation>} args
         * @param {Context} ctx
         */
        evaluate: function(result, args, ctx) {
            Tools.checkParamCount(result.node, "Vec3", [0,3], args.length);

            var argArray = [];
            var isStatic = true;
            args.forEach(function (param, index) {
                if (!param.canNumber())
                    Shade.throwError(result.node, "Parameter " + index + " has invalid type for Vec3, expected 'number', but got " + param.getType());
                isStatic = isStatic && param.hasStaticValue();
                if (isStatic)
                    argArray.push(param.getStaticValue());
            });

            //if (isStatic)
            //    result.setStaticValue(new Color(argArray))
        }
    };

    var Vec3Instance = {
        x: Tools.singleAccessor("Vec3.x", { type: TYPES.OBJECT, kind: KINDS.FLOAT3 }, [0,1,3]),
        y: Tools.singleAccessor("Vec3.y", { type: TYPES.OBJECT, kind: KINDS.FLOAT3 }, [0,1,3]),
        z: Tools.singleAccessor("Vec3.z", { type: TYPES.OBJECT, kind: KINDS.FLOAT3 }, [0,1,3]),
        sub: {
            type: TYPES.FUNCTION,
            evaluate: function(result, args) {
                Tools.checkParamCount(result.node, "Vec3::sub", [1], args.length);
            }
        },
        length: {
            type: TYPES.FUNCTION,
            evaluate: function(result, args) {
                Tools.checkParamCount(result.node, "Vec3::length", [0], args.length);
            }
        },
        normalized: {
            type: TYPES.FUNCTION,
            evaluate: function(result, args) {
                Tools.checkParamCount(result.node, "Vec3::normalized", [0], args.length);
                var typeInfo = {
                    type: TYPES.OBJECT,
                    kind: KINDS.FLOAT3
                }
                return typeInfo;
            }
        },
        dot: {
            type: TYPES.FUNCTION,
            evaluate: function(result, args) {
                Tools.checkParamCount(result.dot, "Vec3::dot", [1], args.length);
            }
        }
    };


    Base.extend(ns, {
        id: "Vec3",
        kind: "float3",
        object: {
            constructor: Vec3Constructor,
            static: {}
        },
        instance: Vec3Instance
    });


}(exports));

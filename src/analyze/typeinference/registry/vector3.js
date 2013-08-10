(function(ns){

    var Shade = require("../../../interfaces.js"),
        TYPES = Shade.TYPES,
        KINDS = Shade.OBJECT_KINDS,
        Base = require("../../../base/index.js"),
        Tools = require("./tools.js"),
        Annotation = require("../../../base/annotation.js").Annotation;





    var Vector3Constructor =  {
        type: TYPES.OBJECT,
        kind: KINDS.FLOAT3,
        /**
         * @param {Annotation} result
         * @param {Array.<Annotation>} args
         * @param {Context} ctx
         */
        evaluate: function(result, args, ctx) {
            Tools.checkParamCount(result.node, "Vector3", [0,3], args.length);

            var argArray = [];
            var isStatic = true;
            args.forEach(function (param, index) {
                if (!param.canNumber())
                    Shade.throwError(result.node, "Parameter " + index + " has invalid type for Vector3, expected 'number', but got " + param.getType());
                isStatic = isStatic && param.hasStaticValue();
                if (isStatic)
                    argArray.push(param.getStaticValue());
            });

            //if (isStatic)
            //    result.setStaticValue(new Color(argArray))
        }
    };


    var Vector3StaticObject = {
    };

    var Vector3Instance = {
        x: { type: TYPES.NUMBER },
        y: { type: TYPES.NUMBER },
        z: { type: TYPES.NUMBER },
        sub: {
            type: TYPES.UNDEFINED,
            evaluate: function(result, args) {
                Tools.checkParamCount(result.node, "Vector3::sub", [1], args.length);
            }
        },
        length: {
            type: TYPES.NUMBER,
            evaluate: function(result, args) {
                Tools.checkParamCount(result.node, "Vector3::length", [0], args.length);
            }
        },
        normalize: {
            type: TYPES.UNDEFINED,
            evaluate: function(result, args) {
                Tools.checkParamCount(result.node, "Vector3::normalize", [0], args.length);
            }
        },
        dot: {
            type: TYPES.NUMBER,
            evaluate: function(result, args) {
                Tools.checkParamCount(result.dot, "Vector3::dot", [1], args.length);
            }
        }
    };


    Base.extend(ns, {
        id: "Vector3",
        kind: "float3",
        object: {
            constructor: Vector3Constructor,
            static: Vector3StaticObject
        },
        instance: Vector3Instance
    });


}(exports));

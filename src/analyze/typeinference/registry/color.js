(function(ns){

    var Shade = require("../../../interfaces.js"),
        TYPES = Shade.TYPES,
        KINDS = Shade.OBJECT_KINDS,
        Tools = require("./tools.js");


    var ColorConstructor =  {
        type: TYPES.OBJECT,
        kind: KINDS.COLOR,
        /**
         * @param {Annotation} result
         * @param {Array.<Annotation>} args
         * @param {Context} ctx
         */
        evaluate: function(result, args, ctx) {
            Tools.checkParamCount(result.node, "Color", [0,1,2,3,4], args.length);

            var argArray = [];
            var isStatic = true;
            args.forEach(function (param, index) {
                if (!param.canNumber())
                    Shade.throwError(result.node, "Parameter " + index + " has invalid type for Color.rgb, expected 'float', but got " + param.getType());
                isStatic = isStatic && param.hasStaticValue();
                if (isStatic)
                    argArray.push(param.getStaticValue());
            });
            var typeInfo = {
                type: TYPES.OBJECT,
                kind: KINDS.COLOR
            }
            if (isStatic)
                typeInfo.staticValue = null;

            return typeInfo;
        }
    };


    var ColorStaticObject = {
        rgb: ColorConstructor
    };

    var ColorInstance = {
        r: Tools.singleAccessor("Color.r", { type: TYPES.OBJECT, kind: KINDS.COLOR }, [0,1,3]),
        g: Tools.singleAccessor("Color.g", { type: TYPES.OBJECT, kind: KINDS.COLOR }, [0,1,3]),
        b: Tools.singleAccessor("Color.b", { type: TYPES.OBJECT, kind: KINDS.COLOR }, [0,1,3]),
        a: Tools.singleAccessor("Color.a", { type: TYPES.OBJECT, kind: KINDS.COLOR }, [0,1,3]),
        intensity: {
            type: TYPES.FUNCTION,
            evaluate: function(result, args) {
                Tools.checkParamCount(result.node, "Color::scale", [0], args.length);

            }
        },
        scale: {
            type: TYPES.FUNCTION,
            evaluate: function(result, args) {
                Tools.checkParamCount(result.node, "Color::scale", [1,2], args.length);
                var factor = args[0];
                if (!factor.canNumber())
                    throw new Error("First argument of Color::scale must evaluate to a number, found: " + factor.getTypeString());
            }
        },
        add: {
            type: TYPES.FUNCTION,
            evaluate: function(result, args) {
                Tools.checkParamCount(result.node, "Color::add", [1], args.length);
                var other = args[0];
                if (!other.canColor())
                    throw new Error("First argument of Color::add must evaluate to a color, found: " + other.getTypeString());
            }
        }
    };


    Tools.extend(ns, {
        id: "Color",
        kind: "color",
        object: {
            constructor: ColorConstructor,
            static: ColorStaticObject
        },
        instance: ColorInstance
    });


}(exports));

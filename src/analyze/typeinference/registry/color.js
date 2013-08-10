(function(ns){

    var Shade = require("../../../interfaces.js"),
        TYPES = Shade.TYPES,
        KINDS = Shade.OBJECT_KINDS,
        Tools = require("./tools.js");

    var Color = function(r,g,b,a) {
        if (Array.isArray(r)) {
            switch(r.length) {
                case 0:
                    this.r = this.g = this.b = 0;
                    this.alpha = 1.0;
                    break;
                case 1:
                    this.r = this.g = this.b = r[0];
                    this.alpha = 1.0;
                    break;
                case 2:
                    this.r = this.g = this.b = r[0];
                    this.alpha = r[1];
                    break;
                case 3:
                    this.r = r[0];
                    this.g = r[1];
                    this.b = r[2];
                    this.alpha = 1.0;
                    break;
                case 4:
                    this.r = r[0];
                    this.g = r[1];
                    this.b = r[2];
                    this.alpha = r[3];
                    break;
            }
        } else {
            this.r = r;
            this.g = g;
            this.b = b;
            this.alpha = (a==undefined) ? 1.0 : a;
        }
    };


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

            if (isStatic)
                result.setStaticValue(new Color(argArray))
        }
    };


    var ColorStaticObject = {
        rgb: ColorConstructor
    };

    var ColorInstance = {
        r: { type: TYPES.NUMBER },
        g: { type: TYPES.NUMBER },
        b: { type: TYPES.NUMBER },
        a: { type: TYPES.NUMBER },
        intensity: {
            type: TYPES.NUMBER,
            evaluate: function(result, args) {
                Tools.checkParamCount(result.node, "Color::scale", [0], args.length);

            }
        },
        scale: {
            type: TYPES.UNDEFINED,
            evaluate: function(result, args) {
                Tools.checkParamCount(result.node, "Color::scale", [1,2], args.length);
                var factor = args[0];
                if (!factor.canNumber())
                    throw new Error("First argument of Color::scale must evaluate to a number, found: " + factor.getTypeString());
            }
        },
        add: {
            type: TYPES.UNDEFINED,
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

(function(ns){

    var Shade = require("../../../interfaces.js"),
        TYPES = Shade.TYPES,
        KINDS = Shade.OBJECT_KINDS,
        Annotation = require("../../../base/annotation.js").Annotation;

    var Color = function(r,g,b) {
        if (Array.isArray(r)) {
            this.r = r[0];
            this.g = r[1];
            this.b = r[2];
        } else {
            this.r = r;
            this.g = g;
            this.b = b;
        }
    };

    var ColorObject = {
        rgb: {
            type: TYPES.OBJECT,
            kind: KINDS.COLOR,
            evaluate: function(result, args) {
                if(args.length != 3) {
                    throw new Error("Invalid number of parameters for Color.rgb, expected " + 3);
                }
                var argArray = [];
                var isStatic = true;
                args.forEach(function (arg, index) {
                    var param = new Annotation(arg);
                    if (!param.canInt())
                        throw new Error("Parameter " + index + " has invalid type for Color.rgb, expected 'int', but got " + param.getType());
                    isStatic = isStatic && param.hasStaticValue();
                    if (isStatic)
                        argArray.push(param.getStaticValue());
                });

                if (isStatic)
                    result.setStaticValue(new Color(argArray))
            }
        }
    };

    ns.getEntry = function() { return ColorObject; };
    ns.getId = function() { return "Color"; };


}(exports));

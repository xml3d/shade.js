(function(ns){

    var Shade = require("../../../interfaces.js"),
        TYPES = Shade.TYPES,
        KINDS = Shade.OBJECT_KINDS,
        Annotation = require("../../../base/annotation.js").Annotation;

    var Color = function(r,g,b) {
        if (Array.isArray(r)) {
            if (r.length == 3) {
                this.r = r[0];
                this.g = r[1];
                this.b = r[2];
            } else if (r.length == 1) {
                this.r = this.g = this.b = r[0];
            }
        } else {
            this.r = r;
            this.g = g;
            this.b = b;
        }
    };


    var ColorConstructor =  {
        type: TYPES.OBJECT,
        kind: KINDS.COLOR,
        evaluate: function(result, args) {
            if(!(args.length == 3 || args.length == 1)) {
                throw new Error("Invalid number of parameters for Color.rgb, expected 1 or 3");
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
    };


    var ColorObject = {
        _constructor : ColorConstructor,
        rgb: ColorConstructor
    };

    ns.getEntry = function() { return ColorObject; };
    ns.getId = function() { return "Color"; };


}(exports));

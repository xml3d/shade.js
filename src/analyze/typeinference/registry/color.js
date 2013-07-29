(function(ns){

    var Shade = require("../../../interfaces.js").Shade,
        TYPES = Shade.TYPES,
        KINDS = Shade.OBJECT_KINDS,
        Node = require("../node.js").Node;

    var Color = function(r,g,b) {
        this.r = r;
        this.g = g;
        this.b = b;
    };

    var ColorObject = {
        rgb: {
            type: TYPES.OBJECT,
            kind: KINDS.COLOR,
            evaluate: function(result, args) {
                //console.log("color", args);
                if(args.length != 3) {
                    throw new Error("Invalid number of parameters for Color.rgb, expected " + 3);
                }
            }
        }
    };

    ns.ColorEntry = ColorObject;

}(exports));

(function(ns){

    var Shade = require("../../../interfaces.js"),
        TYPES = Shade.TYPES,
        Tools = require("./tools.js");

    var ColorClosureInstance = {
        mul: {
            type: TYPES.FUNCTION,
            evaluate: function() {
                return {
                    type: TYPES.OBJECT,
                    kind: "Closure"
                };
            }
        },
        add: {
            type: TYPES.FUNCTION,
            evaluate: function() {
                return {
                    type: TYPES.OBJECT,
                    kind: "Closure"
                };
            }
        }
    };

    Tools.extend(ns, {
        id: "ColorClosure",
        kind: "Closure",
        object: {
            constructor: null,
            static: null
        },
        instance: ColorClosureInstance
    });


}(exports));

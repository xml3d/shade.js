(function(ns){

    var Shade = require("../../../interfaces.js");
    var Tools = require("./tools.js");

    var ColorClosureInstance = {
        mul: {

        },
        add : {

        }
    };

    Tools.extend(ns, {
        id: "ColorClosure",
        kind: Shade.OBJECT_KINDS.COLOR_CLOSURE,
        object: {
            constructor: null,
            static: {}
        },
        instance: ColorClosureInstance
    });
}(exports));

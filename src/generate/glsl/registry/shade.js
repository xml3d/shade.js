(function (ns) {

    var Shade = require("../../../interfaces.js");
    var Syntax = require('estraverse').Syntax;
    var Tools = require("../../tools.js");

    var ShadeInstance = {}

    Tools.extend(ns, {
        id: "Shade",
        kind: Shade.OBJECT_KINDS.COLOR_CLOSURE,
        object: {
            constructor: Tools.Vec.generateConstructor,
            static: ShadeInstance
        },
        instance: ShadeInstance
    });

}(exports));

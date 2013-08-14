(function(ns){

    var Shade = require("../../../interfaces.js");
    var Syntax = require('estraverse').Syntax;
    var Tools = require("./tools.js");
    var ANNO = require("../../../base/annotation.js").ANNO;

    var TYPES = Shade.TYPES,
        KINDS = Shade.OBJECT_KINDS;

    var Vec2Instance = {

    }
    Tools.Vec.attachSwizzles(Vec2Instance, 2);


    Tools.extend(ns, {
        id: "Vec2",
        kind: "float2",
        object: {
            constructor: null,
            static: {}
        },
        instance: Vec2Instance
    });

}(exports));

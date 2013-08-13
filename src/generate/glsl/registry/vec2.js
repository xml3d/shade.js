(function(ns){

    var Shade = require("../../../interfaces.js");
    var Syntax = require('estraverse').Syntax;
    var Base = require("../../../base/index.js");
    var Tools = require("./tools.js");

    var Vec2Instance = {
        xy: function() {
            console.log("xy");
        },
        x: function() {
            console.log("x", arguments);
        }
    }


    Base.extend(ns, {
        id: "Vec2",
        kind: "float2",
        object: {
            constructor: null,
            static: {}
        },
        instance: Vec2Instance
    });

}(exports));

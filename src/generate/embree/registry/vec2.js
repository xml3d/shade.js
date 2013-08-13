(function(ns){

    var Shade = require("../../../interfaces.js");
    var Syntax = require('estraverse').Syntax;
    var Tools = require("./tools.js");

    var Vec2Instance = {
        xy: {
            property: function () {
                //console.log("Called property of xy");
            },
            callExp: function(node, args, parent) {
                if (args.length == 0)
                    return node.callee;
                return null; // TODO
            }
        },
        x: function () {
            console.log("x", arguments);
        }
    }


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

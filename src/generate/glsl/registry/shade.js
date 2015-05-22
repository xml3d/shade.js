(function (ns) {

    var Shade = require("../../../interfaces.js");
    var Syntax = require('estraverse').Syntax;
    var Tools = require("../../tools.js");

    var ShadeInstance = {
        mix: { callExp: function(node, args) {
            node.callee = Tools.removeMemberFromExpression(node.callee);
            return node;
        }}
    }

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

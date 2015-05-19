(function (ns) {

    var Shade = require("../../../interfaces.js");
    var Syntax = require('estraverse').Syntax;
    var Tools = require("../../tools.js");

    var ShadeInstance = {
        diffuse: {
            callExp: function(node) {
                return {
                    type: Syntax.BinaryExpression,
                    operator: "+",
                    left: {
                        type: Syntax.CallExpression,
                        callee: node.callee.property,
                        arguments: node.arguments
                    },
                    right: node.callee,
                    extra: {
                        type: Shade.TYPES.OBJECT,
                        kind: Shade.OBJECT_KINDS.COLOR_CLOSURE
                    }
                }
            }
        },
        phong: {

        }

    }

    Tools.extend(ns, {
        id: "Shade",
        kind: Shade.OBJECT_KINDS.COLOR_CLOSURE,
        object: {
            constructor: Tools.Vec.generateConstructor,
            static: {}
        },
        instance: ShadeInstance
    });

}(exports));

(function (ns) {

    var Shade = require("../../../interfaces.js");
    var Syntax = require('estraverse').Syntax;
    var Tools = require('../../tools.js');

    var ShadeInstance = {
        diffuse: {
            callExp: function(node, args, parent) {
                //console.log("HAllo", node.callee);
                var color = node.arguments.shift();
                var closureName = node.arguments.length == 2 ? "oren_nayar" : "diffuse";
                return {
                    type: Syntax.BinaryExpression,
                    operator: "*",
                    left: {
                        type: Syntax.CallExpression,
                        callee: {
                            type: Syntax.Identifier,
                            name: "color"
                        },
                        arguments: [ color ]
                    },
                    right: {
                        type: Syntax.CallExpression,
                        callee: {
                            type: Syntax.Identifier,
                            name: closureName
                        },
                        arguments: node.arguments
                    },
                    extra: {
                        type: Shade.TYPES.OBJECT,
                        kind: Shade.OBJECT_KINDS.COLOR_CLOSURE
                    }
                }
            }
        },
        phong: {

        },
        cookTorrance: {

        }

    }

    Tools.extend(ns, {
        id: "Shade",
        kind: Shade.OBJECT_KINDS.COLOR_CLOSURE,
        object: {
            constructor: function(node, parent) {
                return;
            },
            static: {}
        },
        instance: ShadeInstance
    });

}(exports));

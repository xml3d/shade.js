(function (ns) {

    var Shade = require("../../../interfaces.js");
    var Syntax = require('estraverse').Syntax;
    var Tools = require('./tools.js');

    var ShadeInstance = {
        diffuse: {
            callExp: function(node) {
                return;
            }
        },
        phong: {

        }

    }

    function ShadeConstructor(node) {
        return {
            type: Syntax.CallExpression,
            callee: {
                type: Syntax.Identifier,
                name: "BRDFClosure"
            },
            arguments: [
                {
                    type: Syntax.Identifier,
                    name: "brdfs"
                }
            ],
            extra: {
                type: Shade.TYPES.OBJECT,
                kind: Shade.OBJECT_KINDS.COLOR_CLOSURE
            }
        }
    }

    Tools.extend(ns, {
        id: "Shade",
        kind: Shade.OBJECT_KINDS.COLOR_CLOSURE,
        object: {
            constructor: ShadeConstructor,
            static: {}
        },
        instance: ShadeInstance
    });

}(exports));

(function (ns) {

    var Shade = require("../../../interfaces.js");
    var Syntax = require('estraverse').Syntax;
    var Tools = require('../../tools.js');
    var assert = require('assert');

    function createOSLClosure(node, closureName) {
        var color = node.arguments.shift(), callee = node.callee;

        assert(callee.type == Syntax.MemberExpression);

        var closure = {
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
        };
        if (callee.object.type == Syntax.NewExpression)
            return closure;

        assert.equal(callee.object.type, Syntax.BinaryExpression);

        return {
            type: Syntax.BinaryExpression,
            operator: "+",
            left: callee.object,
            right: closure
        }

    }

    var ShadeInstance = {
        diffuse: {
            callExp: function(node) {
                var closureName = node.arguments.length == 3 ? "oren_nayar" : "diffuse";
                return createOSLClosure(node, closureName);
            }
        },
        phong: {

        },
        cookTorrance: {
            callExp: function(node) {
                return createOSLClosure(node, "microfacet_beckmann_refraction");
            }
        }

    };

    Tools.extend(ns, {
        id: "Shade",
        kind: Shade.OBJECT_KINDS.COLOR_CLOSURE,
        object: {
            constructor: function() {},
            static: {}
        },
        instance: ShadeInstance
    });

}(exports));

(function (ns) {

    var Shade = require("../../../interfaces.js");
    var Syntax = require('estraverse').Syntax;
    var Tools = require('../../tools.js');
    var assert = require('assert');

    function createSimpleClosure(closureName, node) {
        return  {
                type: Syntax.CallExpression,
                callee: {
                    type: Syntax.Identifier,
                    name: closureName
                },
                arguments: node.arguments,
                extra: {
                    type: Shade.TYPES.OBJECT,
                    kind: Shade.OBJECT_KINDS.COLOR_CLOSURE
                }
            }
    }

    function createScaledClosure(color, closureName, node) {
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
        };
    }

    function createOSLClosure(node, closureName, color) {
        var callee = node.callee;

        assert(callee.type == Syntax.MemberExpression);

        var closure = color ? createScaledClosure(color, closureName, node) :  createSimpleClosure(closureName, node);

        if (callee.object.type == Syntax.NewExpression)
            return closure;

        //assert.equal(callee.object.type, Syntax.BinaryExpression);

        return {
            type: Syntax.BinaryExpression,
            operator: "+",
            left: callee.object,
            right: closure,
            extra: {
                type: Shade.TYPES.OBJECT,
                kind: Shade.OBJECT_KINDS.COLOR_CLOSURE
            }
        }

    }

    var ShadeInstance = {
        diffuse: {
            callExp: function(node) {
                var closureName = node.arguments.length == 3 ? "oren_nayar" : "diffuse";
                var color = node.arguments.shift();
                return createOSLClosure(node, closureName, color);
            }
        },
        phong: {

        },
        cookTorrance: {
            callExp: function(node) {
                var args = node.arguments;
                var color = args.shift();
                // Remove eta
                args[1] = args[2];
                args.pop();
                return createOSLClosure(node, "microfacet_beckmann", color);
            }
        },
        ward: {
           callExp: function(node) {
               var color = node.arguments.shift();
               return createOSLClosure(node, "ward", color);
            }
        },
        reflect: {
          callExp: function(node) {
                return createOSLClosure(node, "reflection", node.arguments.pop());
            }
        },
        refract: {
          callExp: function(node) {
                return createOSLClosure(node, "refraction",  node.arguments.pop());
            }
        },
        scatter: {
          callExp: function(node) {
               var color = node.arguments.shift();
               node.arguments.splice(1,1);
               return createOSLClosure(node, "westin_backscatter", color);
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

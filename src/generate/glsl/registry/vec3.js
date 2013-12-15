(function(ns){

    var Shade = require("../../../interfaces.js");
    var Syntax = require('estraverse').Syntax;
    var Tools = require("../../tools.js");
    var ANNO = require("../../../base/annotation.js").ANNO;

    var TYPES = Shade.TYPES,
        KINDS = Shade.OBJECT_KINDS;

    var Vec3Instance = {
        normalize: {
            callExp: Tools.Vec.createFunctionCall.bind(null, 'normalize', 0)
        },
        flip: {
            callExp: Tools.Vec.createFunctionCall.bind(null, '-', 0)
        },
        dot: {
            callExp: Tools.Vec.createFunctionCall.bind(null, 'dot', 3)
        },
        reflect: {
            callExp: Tools.Vec.createFunctionCall.bind(null, 'reflect', 3)
        },
        refract: {
            callExp: function (node, args, parent) {
                var eta = node.arguments.pop();
                var result = Tools.Vec.createFunctionCall("refract", 3, node, args, parent);
                ANNO(eta).setType(TYPES.NUMBER);
                result.arguments.push(eta);
                return result;
            }
        },
        length: {
            callExp: Tools.Vec.generateLengthCall
        },
        cross: {
            callExp: Tools.Vec.createFunctionCall.bind(null, "cross", 3)
        }
    }
    Tools.Vec.attachSwizzles(Vec3Instance, 3);
    Tools.Vec.attachOperators(Vec3Instance, 3, {
        add: '+',
        sub: '-',
        mul: '*',
        div: '/',
        mod: '%'
    })


    Tools.extend(ns, {
        id: "Vec3",
        kind: KINDS.FLOAT3,
        object: {
            constructor: Tools.Vec.generateConstructor,
            static: {}
        },
        instance: Vec3Instance
    });

}(exports));

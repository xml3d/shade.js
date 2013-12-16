(function(ns){

    var Shade = require("../../../interfaces.js");
    var Syntax = require('estraverse').Syntax;
    var Tools = require("../../tools.js");
    var ANNO = require("../../../base/annotation.js").ANNO;

    var TYPES = Shade.TYPES,
        KINDS = Shade.OBJECT_KINDS;

    var Vec2Instance = {
        normalize: {
            callExp: Tools.Vec.createFunctionCall.bind(null, 'normalize', 0)
        },
        flip: {
            callExp: Tools.Vec.createFunctionCall.bind(null, '-', 0)
        },
        dot: {
            callExp: Tools.Vec.createFunctionCall.bind(null, 'dot', 2)
        },
        reflect: {
            callExp: Tools.Vec.createFunctionCall.bind(null, 'reflect', 2)
        },
        length: {
            callExp: Tools.Vec.generateLengthCall
        }
    }
    Tools.Vec.attachSwizzles(Vec2Instance, 2, Tools.Vec.createSwizzle);
    Tools.Vec.attachOperators(Vec2Instance, 2, {
        add: '+',
        sub: '-',
        mul: '*',
        div: '/',
        mod: '%'
    })


    Tools.extend(ns, {
        id: "Vec2",
        kind: KINDS.FLOAT2,
        object: {
            constructor: Tools.Vec.generateConstructor,
            static: {}
        },
        instance: Vec2Instance
    });

}(exports));

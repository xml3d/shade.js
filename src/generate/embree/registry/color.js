(function(ns){

    var Shade = require("../../../interfaces.js");
    var Syntax = require('estraverse').Syntax;
    var Tools = require("./tools.js");
    var ANNO = require("../../../base/annotation.js").ANNO;

    var TYPES = Shade.TYPES,
        KINDS = Shade.OBJECT_KINDS;

    var ColorInstance = {
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
        length: {
            callExp: Tools.Vec.generateLengthCall
        }
    }
    Tools.Vec.attachSwizzles(ColorInstance, 3);
    Tools.Vec.attachOperators(ColorInstance, 3, {
        add: '+',
        sub: '-',
        mul: '*',
        div: '/',
        mod: '%'
    })


    Tools.extend(ns, {
        id: "Color",
        kind: KINDS.FLOAT3,
        object: {
            constructor: Tools.Vec.generateConstructor,
            static: {}
        },
        instance: ColorInstance
    });

}(exports));

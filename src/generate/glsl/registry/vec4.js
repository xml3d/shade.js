(function(ns){

    var Shade = require("../../../interfaces.js");
    var Syntax = require('estraverse').Syntax;
    var Tools = require("../../tools.js");
    var ANNO = require("../../../type-system/annotation.js").ANNO;

    var TYPES = Shade.TYPES,
        KINDS = Shade.OBJECT_KINDS;

    var Vec4Instance = {
        normalize: {
            callExp: Tools.Vec.createFunctionCall.bind(null, 'normalize', 0)
        },
        flip: {
            callExp: Tools.Vec.createFunctionCall.bind(null, '-', 0)
        },
        dot: {
            callExp: Tools.Vec.createFunctionCall.bind(null, 'dot', 4)
        },
        reflect: {
            callExp: Tools.Vec.createFunctionCall.bind(null, 'reflect', 4)
        },
        length: {
            callExp: Tools.Vec.generateLengthCall
        }
    }
    Tools.Vec.attachSwizzles(Vec4Instance, 4, Tools.Vec.createSwizzle, Tools.Vec.createSwizzleOperator);
    Tools.Vec.attachOperators(Vec4Instance, 4, {
        add: '+',
        sub: '-',
        mul: '*',
        div: '/',
        mod: '%'
    })


    Tools.extend(ns, {
        id: "Vec4",
        kind: KINDS.FLOAT4,
        object: {
            constructor: Tools.Vec.generateConstructor,
            static: {}
        },
        instance: Vec4Instance
    });

}(exports));

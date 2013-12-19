(function(ns){

    var Shade = require("../../../interfaces.js");
    var Tools = require("../../tools.js");
    var OSLTools = require("./osl-tools.js");

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
    Tools.Vec.attachSwizzles(Vec2Instance, 2, OSLTools.Vec.createOSLSwizzle);
    Tools.Vec.attachOperators(Vec2Instance, 2, {
        add: '+',
        sub: '-',
        mul: '*',
        div: '/',
        mod: '%'
    })


    Tools.extend(ns, {
        id: "Vec2",
        kind: Shade.OBJECT_KINDS.FLOAT2,
        object: {
            constructor: function(node) {
                if(node.arguments == 2) {
                    node.arguments.push({
                        type: Syntax.Literal,
                        value: 1,
                        extra: {
                            type: Shade.TYPES.NUMBER
                        }
                    })
                }
                return node;
            },
            static: {}
        },
        instance: Vec2Instance
    });

}(exports));

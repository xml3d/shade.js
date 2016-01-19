var Tools = require("../../tools.js");

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


module.exports = {
    call: function (node, name) {
        if (Vec4Instance.hasOwnProperty(name)) {
            return Vec4Instance[name].callExp(node)
        }
    },
    property: function () {
    }
};

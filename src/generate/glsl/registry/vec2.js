var Shade = require("../../../interfaces.js");
var Syntax = require('estraverse').Syntax;
var Tools = require("../../tools.js");
var ANNO = require("../../../type-system/annotation.js").ANNO;

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
};

Tools.Vec.attachSwizzles(Vec2Instance, 2, Tools.Vec.createSwizzle, Tools.Vec.createSwizzleOperator);

Tools.Vec.attachOperators(Vec2Instance, 2, {
    add: '+',
    sub: '-',
    mul: '*',
    div: '/',
    mod: '%'
});


module.exports = {
    call: function (node, name) {
        if (Vec2Instance.hasOwnProperty(name)) {
            return Vec2Instance[name].callExp(node)
        }
    },
    property: function () {
    }
};

var Tools = require("../../tools.js");
var TypeInfo = require("../../../type-system/typeinfo.js").TypeInfo;


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
            var result = Tools.Vec.createFunctionCall("refract", 3, node);
            new TypeInfo(eta.extra).setType("number");
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
};

Tools.Vec.attachSwizzles(Vec3Instance, 3, Tools.Vec.createSwizzle, Tools.Vec.createSwizzleOperator);
Tools.Vec.attachOperators(Vec3Instance, 3, {
    add: '+',
    sub: '-',
    mul: '*',
    div: '/',
    mod: '%'
});


function Vec3Call(node, name) {
    if (Vec3Instance.hasOwnProperty(name)) {
        return Vec3Instance[name].callExp(node)
    }
}

module.exports = {
    call: Vec3Call,
    property: function () {
    }
};

var Tools = require("./tools.js");
var Shade = require("../../../interfaces.js");

var Vec4 = function Vec4(node, arguments) {
	return Tools.Vec.constructorEvaluate("Vec4", 4)(node, arguments);
};

Vec4.prototype = {
	length: Tools.Vec.optionalZeroEvaluate.bind(null, "Vec4", "length", 4, 1, 1)
};

Tools.Vec.attachSwizzles(Vec4.prototype, "Vec4", 4);
Tools.Vec.attachVecMethods(Vec4.prototype, "Vec4", 4, 4, ['add', 'sub', 'mul', 'div', 'mod', 'reflect', 'cross']);
Tools.Vec.attachVecMethods(Vec4.prototype, "Vec4", 1, 4, ['dot']);
Tools.Vec.attachVecMethods(Vec4.prototype, "Vec4", 4, 0, ['normalize', 'flip']);

module.exports = Vec4;


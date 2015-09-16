var Tools = require("./tools.js");

var Vec2 = function Vec2(node, arguments) {
	return Tools.Vec.constructorEvaluate("Vec2", 2)(node, arguments);
};

Vec2.prototype = {
	length: Tools.Vec.optionalZeroEvaluate.bind(null, "Vec2", "length", 2, 1, 1)
};

Tools.Vec.attachSwizzles(Vec2.prototype, "Vec2", 2);
Tools.Vec.attachVecMethods(Vec2.prototype, "Vec2", 2, 2, ['add', 'sub', 'mul', 'div', 'mod', 'reflect']);
Tools.Vec.attachVecMethods(Vec2.prototype, "Vec2", 1, 2, ['dot']);
Tools.Vec.attachVecMethods(Vec2.prototype, "Vec2", 2, 0, ['normalize', 'flip']);

module.exports = Vec2;

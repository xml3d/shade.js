var Tools = require("./tools.js");
var Shade = require("../../../interfaces.js");

var Vec3 = function Vec3(node, arguments) {
	return Tools.Vec.constructorEvaluate("Vec3", 3)(node, arguments);
};

Vec3.prototype = {
	length: Tools.Vec.optionalZeroEvaluate.bind(null, "Vec3", "length", 3, 1, 1)
};

Tools.Vec.attachSwizzles(Vec3.prototype, "Vec3", 3);
Tools.Vec.attachVecMethods(Vec3.prototype, "Vec3", 3, 3, ['add', 'sub', 'mul', 'div', 'mod', 'reflect', 'cross']);
Tools.Vec.attachVecMethods(Vec3.prototype, "Vec3", 1, 3, ['dot']);
Tools.Vec.attachVecMethods(Vec3.prototype, "Vec3", 3, 0, ['normalize', 'flip']);


Vec3.prototype.refract = function (result, args) {
	if (args.length < 2)
		Shade.throwError(result.node, "Not enough parameters for refract.");

	var eta = args.pop();
	if (!eta || !eta.canNumber())
		Shade.throwError(result.node, "Invalid parameter for refract, expected a number got " + eta.getTypeString());

	Tools.Vec.checkVecArguments("Vec3.refract", 3, false, 0, result, args);

	return {
		type: "object",
		kind: "Vec3"
	};
};

module.exports = Vec3;

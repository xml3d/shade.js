var Tools = require("./tools.js");

var Mat4 = function Mat4(node, arguments) {
    return Tools.Vec.matConstructorEvaluate("Mat4", node, arguments);
};

Tools.Mat.attachMatMethods( Mat4.prototype, "Mat4", ['add', 'sub', 'mul', 'div']);
Tools.Vec.attachVecMethods( Mat4.prototype, "Mat4", 4, 4, ['mulVec']);

Mat4.prototype.col = function(node, arguments) {
    return Tools.Mat.colEvaluate("Mat4", node, arguments);
};

module.exports = Mat4;

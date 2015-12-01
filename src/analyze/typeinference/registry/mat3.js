var Tools = require("./tools.js");

var Mat3 = function Mat3(node, arguments) {
    return Tools.Vec.matConstructorEvaluate("Mat3", 3)(node, arguments);
};

Tools.Mat.attachMatMethods( Mat3.prototype, "Mat3", ['add', 'sub', 'mul', 'div']);
Tools.Vec.attachVecMethods( Mat3.prototype, "Mat3", 3, 3, ['mulVec']);

Mat3.prototype.col = Tools.Mat.colEvaluate.bind(null, "Mat3");

module.exports = Mat3;

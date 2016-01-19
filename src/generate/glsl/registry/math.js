var Tools = require("../../tools.js");
var TypeInfo = require("../../../type-system/typeinfo.js").TypeInfo;

var MathConstants = ["E", "PI", "LN2", "LOG2E", "LOG10E", "PI", "SQRT1_2", "SQRT2"];

// TODO: Implement saturate
// TODO: Rename atan
// TODO: Handle ceil?

var MathCall = function (node, name) {
    // Remove Math.
    node.callee = Tools.removeMemberFromExpression(node.callee);

    // Cast all arguments of the math function to float, as they are
    // not defined for other types (int, bool)
    // Don't replace the arguments array, it's already cached by the traversal
    node.arguments.forEach(function (arg, i) {
        var t = new TypeInfo(arg.extra);
        if (t.isInt()) {
            node.arguments[i] = Tools.castToFloat(node.arguments[i]);
        }
    });
    return node;
};

var MathProperty = function (node, name) {
    if(MathConstants.indexOf(name) != -1) {
        return {type: 'Literal', value: Math[name], extra: {type: "number"}};
    }
};

module.exports = {
    call: MathCall,
    property: MathProperty
};


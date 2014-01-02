(function(ns){

   var Shade = require("../../../interfaces.js");
   var Syntax = require('estraverse').Syntax;
   var Tools = require("../../tools.js");

    var MathConstants = ["E", "PI", "LN2", "LOG2E", "LOG10E", "PI", "SQRT1_2", "SQRT2"];


    var handleIntVersion = function(node) {
        node.extra.type = Shade.TYPES.NUMBER;
        node.callee = Tools.removeMemberFromExpression(node.callee);
        return node;
    };

    var handleMathCall = function(opt) {
        opt = opt ||{};
        return function(node, args) {
            if (node.type !== Syntax.CallExpression) {
                Shade.throwError(node, "Internal Error in Math object");
            }
            // Cast all arguments of the math function to float, as they are
            // not defined for other types (int, bool)
            // Don't replace the arguments array, it's already cached by the traversal
            for(var i = 0; i < args.length; i++) {
                if (args[i].isInt())
                    node.arguments[i] = Tools.castToFloat(node.arguments[i]);
            }
            node.callee = Tools.removeMemberFromExpression(node.callee);
            if (opt.name) {
                node.callee.name = opt.name;
            }
            if (opt.arguments) {
                for (var idx = 0; idx < opt.arguments.length; ++idx)
                    if (typeof opt.arguments[idx] !== "undefined")
                        node.arguments[idx] = opt.arguments[idx];
            }
            return node;
        }
    };

    var MathEntry  = {
        abs: { callExp: handleMathCall() },
        acos: { callExp: handleMathCall() },
        asin: { callExp: handleMathCall() },
        atan: { callExp: handleMathCall() },
        atan2: { callExp: handleMathCall({ name: "atan" }) },
        ceil: { callExp: handleIntVersion },
        cos:  { callExp: handleMathCall() },
        exp: { callExp: handleMathCall() },
        floor: { callExp: handleMathCall() },
        // imul: { callExp: handleMathCall },
        log: { callExp: handleMathCall() },
        max: { callExp: handleMathCall() },
        min: { callExp: handleMathCall() },
        pow: { callExp: handleMathCall() },
        // random: function random() { [native code] }
        round: { callExp: handleMathCall() }, // Since GLSL 1.3, what does WebGL use?
        sin:  { callExp: handleMathCall() },
        sqrt: { callExp: handleMathCall() },
        tan: { callExp: handleMathCall() },

        // Non-standard methods
        clamp: { callExp: handleMathCall() },
        saturate: { callExp: handleMathCall({ name: "clamp", arguments: [
            undefined,
            {
                type: Syntax.Literal,
                value: 0.0,
                extra: {
                    type: Shade.TYPES.NUMBER,
                    staticValue: 0.0
                }
            },
            {
                type: Syntax.Literal,
                value: 1.0,
                extra: {
                    type: Shade.TYPES.NUMBER,
                    staticValue: 1.0
                }
            }
        ] }) },
        smoothstep: { callExp: handleMathCall() },
        step: { callExp: handleMathCall() },
        fract: { callExp: handleMathCall() },
        mix: { callExp: handleMathCall() }
    };

    MathConstants.forEach(function (constant) {
        MathEntry[constant] = {
            property: function () {
                return  { type: Syntax.Literal, value: Math[constant], extra: { type: Shade.TYPES.NUMBER } };
            }
        }
    });

    Tools.extend(ns, {
        id: "Math",
        object: {
            constructor: null,
            static: MathEntry
        },
        instance: MathEntry
    });

}(exports));

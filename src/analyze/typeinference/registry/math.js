(function (ns) {

    var TYPES = require("../../../interfaces.js").Shade.TYPES,
        Annotation = require("../../../base/annotation.js").Annotation;


    var evaluateMethod = function (name, paramCount) {
        return function (result, args) {
            if (paramCount != -1) { // Arbitrary number of arguments
                if (!args || args.length != paramCount) {
                    throw new Error("Invalid number of parameters for Math." + name + ", expected " + paramCount);
                }
            }

            var argArray = [];
            var isStatic = true;
            args.forEach(function (arg, index) {
                var param = new Annotation(arg);
                if (!param.canNumber())
                    throw new Error("Parameter " + index + " has invalid type for Math." + name + ", expected 'number', but got " + param.getType());
                isStatic = isStatic && param.hasStaticValue();
                if (isStatic)
                    argArray.push(param.getStaticValue());
            });

            if (isStatic) {
                result.setStaticValue(Math[name].apply(undefined, argArray));
            } else {
                result.setDynamicValue();
            }
        }
    }

    var MathObject = {
        random: {
            type: TYPES.NUMBER,
            evaluate: function(result, args) {
                if (args.length)
                    throw new Error("Math.random has no parameters.");
                result.setDynamicValue();
            }
        }
    };

    var MathConstants = ["E", "PI", "LN2", "LOG2E", "LOG10E", "PI", "SQRT1_2", "SQRT2"];
    var OneParameterNumberMethods = ["acos", "asin", "atan", "cos", "exp", "log", "round", "sin", "sqrt", "tan"];
    var OneParameterIntMethods = ["ceil", "floor"];
    var TwoParameterNumberMethods = ["atan2", "pow"];
    var ArbitraryParameterNumberMethods = ["max", "min"];

    MathConstants.forEach(function (constant) {
        MathObject[constant] = { type: TYPES.NUMBER, staticValue: Math[constant] };
    });

    OneParameterNumberMethods.forEach(function (method) {
        MathObject[method] = { type: TYPES.NUMBER, evaluate: evaluateMethod(method, 1) };
    });

    TwoParameterNumberMethods.forEach(function (method) {
        MathObject[method] = { type: TYPES.NUMBER, evaluate: evaluateMethod(method, 2) };
    });

    OneParameterIntMethods.forEach(function (method) {
        MathObject[method] = { type: TYPES.INT, evaluate: evaluateMethod(method, 1) };
    });

    ArbitraryParameterNumberMethods.forEach(function (method) {
        MathObject[method] = { type: TYPES.NUMBER, evaluate: evaluateMethod(method, -1) };
    });


    var register = function (to) {
        to["Math"] = MathObject;
    };

    ns.getEntry = function() { return MathObject };
    ns.getId = function() { return "Math"; };


}(exports));

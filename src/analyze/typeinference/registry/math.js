(function (ns) {

    var Shade = require("../../../interfaces.js"),
        TYPES = Shade.TYPES,
        Base = require("../../../base/index.js"),
        Tools = require("./tools.js");


    var notStatic = function() {};

    var evaluateStatic = function(name) {
        return function (result, args) {
            if (Tools.allArgumentsAreStatic(args)) {
                var callArgs = args.map(function (a) {
                    return a.getStaticValue();
                });
                return Math[name].apply(null, callArgs);
            }
        }
    }

    var evaluateMethod = function (name, paramCount, returnType) {
        /**
         * @param {Annotation} result
         * @param {Array.<Annotation>} args
         * @param {Context} ctx
         */
        return function (result, args, ctx) {
            if (paramCount != -1) { // Arbitrary number of arguments
                if (!args || args.length != paramCount) {
                    throw new Error("Invalid number of parameters for Math." + name + ", expected " + paramCount);
                }
            }

            args.forEach(function (param, index) {
                if (!(param.canNumber() || param.isVector()))
                    throw new Error("Parameter " + index + " has invalid type for Math." + name + ", expected 'number', but got " + param.getType());
            });
            var typeInfo = {
                type: returnType || args[0].isVector() ? TYPES.OBJECT : TYPES.NUMBER
            }
            args[0].isVector() && (typeInfo.kind = args[0].getKind());

            return typeInfo;
        }
    }

    var MathObject = {
        random: {
            type: TYPES.FUNCTION,
            evaluate: function (node, args) {
                if (args.length)
                    throw new Error("Math.random has no parameters.");
                return {
                    type: TYPES.NUMBER
                }
            },
            computeStaticValue: notStatic
        },
        abs: {
            type: TYPES.FUNCTION,
            evaluate: function (result, args) {
                Tools.checkParamCount(result.node, "Math.abs", [1], args.length);
                var typeInfo = {};
                if(args[0].canNumber()) {
                    typeInfo.type = args[0].getType();
                }
                else if (args[0].isVector()) {
                    typeInfo.type = args[0].getType();
                    typeInfo.kind = args[0].getKind();
                }
                else {
                    Shade.throwError(result.node, "InvalidType for Math.abs");
                }
                // TODO: Static value
                return typeInfo;
            },
            computeStaticValue: evaluateStatic("abs")
        },


        // Non-standard methods
        clamp: {
            type: TYPES.FUNCTION,
            evaluate: function (result, args) {
                Tools.checkParamCount(result.node, "Math.clamp", [3], args.length);

                if (args.every(function (e) {
                    return e.canNumber();
                })) {
                    return { type: TYPES.NUMBER }
                }
                Shade.throwError(result.node, "Math.clamp not supported with argument types: " + args.map(function (arg) {
                    return arg.getTypeString();
                }).join(", "));
            },
            computeStaticValue: evaluateStatic("clamp")

        },
        smoothstep: {
            type: TYPES.FUNCTION,
            evaluate: function (result, args, ctx) {
                Tools.checkParamCount(result.node, "Math.smoothstep", [3], args.length);

                if (args.every(function (e) { return e.canNumber(); })) {
                    return { type: TYPES.NUMBER };
                }
                if (args.every(function (e) {
                    return e.isVector();
                })) {
                    if (!(args[0].equals(args[1]) && args[1].equals(args[2]))) {
                        Shade.throwError(result.node, "Math.smoothstep: All arguments have to have the same type: " + args.map(function (arg) {
                            return arg.getTypeString();
                        }).join(", "));
                    };
                    return  {
                        type: TYPES.OBJECT,
                        kind: args[0].getKind()
                    }

                };
                Shade.throwError(result.node, "Math.smoothstep not supported with argument types: " + args.map(function (arg) {
                    return arg.getTypeString();
                }).join(", "));
            },
            computeStaticValue: evaluateStatic("smoothstep")
        },
        step: {
            type: TYPES.FUNCTION,
            evaluate: function (result, args, ctx) {
                Tools.checkParamCount(result.node, "Shade.step", [2], args.length);

                if (Tools.allArgumentsCanNumber(args)) {
                    return { type: TYPES.NUMBER }
                }
                Shade.throwError(result.node, "Shade.step not supported with argument types: " + args.map(function (arg) {
                    return arg.getTypeString();
                }).join(", "));
            },
            computeStaticValue: evaluateStatic("step")
        },
        fract: {
            type: TYPES.FUNCTION,
            evaluate: Tools.Vec.anyVecArgumentEvaluate.bind(null, "fract"),
            computeStaticValue: evaluateStatic("fract")
        },
        mix: {
            type: TYPES.FUNCTION,
            evaluate: function (result, args, ctx) {
                Tools.checkParamCount(result.node, "Math.mix", [3], args.length);

                var cnt = Tools.Vec.checkAnyVecArgument(result.node, "Math.mix", args[0]);

                var typeInfo = {};
                Base.extend(typeInfo, Tools.Vec.getType(cnt));

                if (!args[1].equals(args[0]))
                    Shade.throwError(result.node, "Math.mix types of first two arguments do no match: got " + args[0].getTypeString() +
                        " and " + args[1].getTypeString());
                if (!args[2].canNumber())
                    Shade.throwError(result.node, "Math.mix third argument is not a number.");

                return typeInfo;
            },
            computeStaticValue: evaluateStatic("mix")
        },
        saturate: {
            type: TYPES.FUNCTION,
            evaluate: function (result, args, ctx) {
                Tools.checkParamCount(result.node, "Shade.saturate", [1], args.length);

                var typeInfo = {
                    type: TYPES.NUMBER
                }
                var arg = args[0];
                if (!arg.canNumber()) {
                    Shade.throwError(result.node, "Math.saturate not supported with argument type: " + arg.getTypeString());
                }
                return typeInfo;
            },
            computeStaticValue: evaluateStatic("saturate")
        }
    };

    var MathConstants = ["E", "PI", "LN2", "LOG2E", "LOG10E", "PI", "SQRT1_2", "SQRT2"];
    var OneParameterNumberMethods = ["acos", "asin", "atan", "cos", "exp", "log", "round", "sin", "sqrt", "tan", "ceil", "floor"];
    var OneParameterIntMethods = [];
    var TwoParameterNumberMethods = ["atan2", "pow"];
    var ArbitraryParameterNumberMethods = ["max", "min"];

    MathConstants.forEach(function (constant) {
        MathObject[constant] = { type: TYPES.NUMBER, staticValue: Math[constant] };
    });

    OneParameterNumberMethods.forEach(function (method) {
        MathObject[method] = { type: TYPES.FUNCTION, evaluate: evaluateMethod(method, 1), computeStaticValue: evaluateStatic(method) };
    });

    TwoParameterNumberMethods.forEach(function (method) {
        MathObject[method] = { type: TYPES.FUNCTION, evaluate: evaluateMethod(method, 2), computeStaticValue: evaluateStatic(method)  };
    });

    OneParameterIntMethods.forEach(function (method) {
        MathObject[method] = { type: TYPES.FUNCTION, evaluate: evaluateMethod(method, 1, TYPES.INT), computeStaticValue: evaluateStatic(method)  };
    });

    ArbitraryParameterNumberMethods.forEach(function (method) {
        MathObject[method] = { type: TYPES.FUNCTION, evaluate: evaluateMethod(method, -1), computeStaticValue: evaluateStatic(method)  };
    });

    Base.extend(ns, {
        id: "Math",
        object: {
            constructor: null,
            static: MathObject,
            staticValue: Math
        },
        instance: MathObject
    });


}(exports));

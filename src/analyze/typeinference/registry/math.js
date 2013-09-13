(function (ns) {

    var Shade = require("../../../interfaces.js"),
        TYPES = Shade.TYPES,
        Base = require("../../../base/index.js"),
        Tools = require("./tools.js");


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

            var argArray = [];
            var isStatic = true;
            args.forEach(function (param, index) {
                if (!param.canNumber())
                    throw new Error("Parameter " + index + " has invalid type for Math." + name + ", expected 'number', but got " + param.getType());
                isStatic = isStatic && param.hasStaticValue();
                if (isStatic)
                    argArray.push(param.getStaticValue());
            });
            var typeInfo = {
                type: returnType || TYPES.NUMBER
            }
            if (isStatic) {
                typeInfo.staticValue = Math[name].apply(undefined, argArray);
            }
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
            }
        },
        abs: {
            type: TYPES.FUNCTION,
            evaluate: function (result, args) {
                Tools.checkParamCount(result.node, "Math.abs", [1], args.length);
                var typeInfo = {};
                switch (args[0].getType()) {
                    case TYPES.NUMBER:
                    case TYPES.INT:
                        typeInfo.type = args[0].getType();
                        break;
                    default:
                        Shade.throwError(result.node, "InvalidType for Math.abs");
                }
                return typeInfo;
            }
        },


        // Non-standard methods
        clamp: {
            type: TYPES.FUNCTION,
            evaluate: function (result, args) {
                Tools.checkParamCount(result.node, "Math.clamp", [3], args.length);

                if (args.every(function (e) {
                    return e.canNumber();
                })) {
                    var typeInfo = {
                        type: TYPES.NUMBER
                    }
                    if (Tools.allArgumentsAreStatic(args)) {
                        var callArgs = args.map(function (a) {
                            return a.getStaticValue();
                        });
                        typeInfo.staticValue = Math.clamp.apply(null, callArgs);
                    }
                    return typeInfo;
                }
                Shade.throwError(result.node, "Math.clamp not supported with argument types: " + args.map(function (arg) {
                    return arg.getTypeString();
                }).join(", "));
            }
        },
        smoothstep: {
            type: TYPES.FUNCTION,
            evaluate: function (result, args, ctx) {
                Tools.checkParamCount(result.node, "Math.smoothstep", [3], args.length);

                if (args.every(function (e) {
                    return e.canNumber();
                })) {
                    var typeInfo = {
                        type: TYPES.NUMBER
                    }
                    if (Tools.allArgumentsAreStatic(args)) {
                        var callArgs = args.map(function (a) {
                            return a.getStaticValue();
                        });
                        typeInfo.staticValue = Math.smoothstep.apply(null, callArgs);
                    }
                    return typeInfo;
                }
                if (args.every(function (e) {
                    return e.isVector();
                })) {
                    if (!(args[0].equals(args[1]) && args[1].equals(args[2]))) {
                        Shade.throwError(result.node, "Math.smoothstep: All arguments have to have the same type: " + args.map(function (arg) {
                            return arg.getTypeString();
                        }).join(", "));
                    };
                    return typeInfo = {
                        type: TYPES.OBJECT,
                        kind: args[0].getKind()
                    }

                };
                Shade.throwError(result.node, "Math.smoothstep not supported with argument types: " + args.map(function (arg) {
                    return arg.getTypeString();
                }).join(", "));
            }
        },
        step: {
            type: TYPES.FUNCTION,
            evaluate: function (result, args, ctx) {
                Tools.checkParamCount(result.node, "Shade.step", [2], args.length);

                if (args.every(function (e) {
                    return e.canNumber();
                })) {
                    var typeInfo = {
                        type: TYPES.NUMBER
                    }
                    if (Tools.allArgumentsAreStatic(args)) {
                        var callArgs = args.map(function (a) {
                            return a.getStaticValue();
                        });
                        typeInfo.staticValue = Math.step.apply(null, callArgs);
                    }
                    return typeInfo;
                }
                Shade.throwError(result.node, "Shade.step not supported with argument types: " + args.map(function (arg) {
                    return arg.getTypeString();
                }).join(", "));
            }
        },
        fract: {
            type: TYPES.FUNCTION,
            evaluate: Tools.Vec.anyVecArgumentEvaluate.bind(null, "fract")
        },
        mix: {
            type: TYPES.FUNCTION,
            evaluate: function (result, args, ctx) {
                Tools.checkParamCount(result.node, "Shade.mix", [3], args.length);

                var arg = args[0];

                var typeInfo = {};
                var cnt = Tools.Vec.checkAnyVecArgument("Shade.mix", args[0]);
                Base.extend(typeInfo, Tools.Vec.getType(cnt));

                if (!args[1].equals(args[0]))
                    Shade.throwError(result.node, "Shade.mix types of first two arguments do no match: got " + arg[0].getTypeString() +
                        " and " + arg[1].getTypeString());
                if (!args[2].canNumber())
                    Shade.throwError(result.node, "Shade.mix third argument is not a number.");

                return typeInfo;
            }
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
        MathObject[method] = { type: TYPES.FUNCTION, evaluate: evaluateMethod(method, 1) };
    });

    TwoParameterNumberMethods.forEach(function (method) {
        MathObject[method] = { type: TYPES.FUNCTION, evaluate: evaluateMethod(method, 2) };
    });

    OneParameterIntMethods.forEach(function (method) {
        MathObject[method] = { type: TYPES.FUNCTION, evaluate: evaluateMethod(method, 1, TYPES.INT) };
    });

    ArbitraryParameterNumberMethods.forEach(function (method) {
        MathObject[method] = { type: TYPES.FUNCTION, evaluate: evaluateMethod(method, -1) };
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

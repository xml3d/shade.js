(function(ns){

    var Shade = require("../../../interfaces.js"),
        TYPES = Shade.TYPES,
        KINDS = Shade.OBJECT_KINDS,
        Base = require("../../../base/index.js"),
        Tools = require("./tools.js");

    var BRDFImplementation = {};

    var ShadeObject = {
        emission: {
            type: TYPES.FUNCTION,
            evaluate: function(result, args, context, objectReference, root) {
                if (args.length > 0)
                    throw new Error("Shade.emission expects no parameters.");
                return {
                    type: TYPES.OBJECT,
                    kind: KINDS.COLOR_CLOSURE
                };
            }
        },
        diffuse: {
            type: TYPES.FUNCTION,
            evaluate: function(result, args, context, objectReference, root) {
                if (args.length < 1)
                    throw new Error("Shade.diffuse expects at least 1 parameter.")
                var normal = args[0];
                if(!(normal && normal.canNormal())) {
                    throw new Error("First argument of Shade.diffuse must evaluate to a normal");
                }
                return {
                    type: TYPES.OBJECT,
                    kind: KINDS.COLOR_CLOSURE
                };
            }
        },
        phong: {
            type: TYPES.FUNCTION,
            evaluate: function(result, args, ctx) {
                if (args.length < 1)
                    throw new Error("Shade.phong expects at least 1 parameter.")
                var normal = args[0];
                if(!(normal && normal.canNormal())) {
                    throw new Error("First argument of Shade.phong must evaluate to a normal");
                }
                if (args.length > 1) {
                    var shininess = args[1];
                    //console.log("Color: ", color.str(), color.getType(ctx));
                    if(!shininess.canNumber()) {
                        throw new Error("Second argument of Shade.phong must evaluate to a number. Found: " + color.str());
                    }
                }
                return {
                    type: TYPES.OBJECT,
                    kind: KINDS.COLOR_CLOSURE
                };
            }
        },
        clamp: {
            type: TYPES.FUNCTION,
            evaluate: function(result, args) {
                Tools.checkParamCount(result.node, "Shade.clamp", [3], args.length);

                if (args.every(function(e) { return e.canNumber(); })) {
                    var typeInfo = {
                        type: TYPES.NUMBER
                    }
                    if (Tools.allArgumentsAreStatic(args)) {
                        var callArgs = args.map(function(a) {return a.getStaticValue(); });
                        typeInfo.staticValue = Shade.Shade.clamp.apply(null, callArgs);
                    }
                    return typeInfo;
                }
                Shade.throwError(result.node, "Shade.clamp not supported with argument types: " + args.map(function(arg) { return arg.getTypeString(); }).join(", "));
            }
        },
        smoothstep: {
            type: TYPES.FUNCTION,
            evaluate: function(result, args, ctx) {
                Tools.checkParamCount(result.node, "Shade.smoothstep", [3], args.length);

                if (args.every(function(e) { return e.canNumber(); })) {
                    var typeInfo = {
                        type: TYPES.NUMBER
                    }
                    if (Tools.allArgumentsAreStatic(args)) {
                        var callArgs = args.map(function(a) {return a.getStaticValue(); });
                        typeInfo.staticValue = Shade.Shade.smoothstep.apply(null, callArgs);
                    }
                    return typeInfo;
                }
                Shade.throwError(result.node, "Shade.smoothstep not supported with argument types: " + args.map(function(arg) { return arg.getTypeString(); }).join(", "));
            }
        },
        step: {
            type: TYPES.FUNCTION,
            evaluate: function(result, args, ctx) {
                Tools.checkParamCount(result.node, "Shade.step", [2], args.length);

                if (args.every(function(e) { return e.canNumber(); })) {
                    var typeInfo = {
                        type: TYPES.NUMBER
                    }
                    if (Tools.allArgumentsAreStatic(args)) {
                        var callArgs = args.map(function(a) {return a.getStaticValue(); });
                        typeInfo.staticValue = Shade.Shade.step.apply(null, callArgs);
                    }
                    return typeInfo;
                }
                Shade.throwError(result.node, "Shade.step not supported with argument types: " + args.map(function(arg) { return arg.getTypeString(); }).join(", "));
            }
        },
        fract: {
            type: TYPES.FUNCTION,
            evaluate: Tools.Vec.anyVecArgumentEvaluate.bind(null, "Shade.fract")
        },
        mix: {
            type: TYPES.FUNCTION,
            evaluate: function(result, args, ctx) {
                Tools.checkParamCount(result.node, "Shade.mix", [3], args.length);

                var arg = args[0];

                var typeInfo = {};
                var cnt = Tools.Vec.checkAnyVecArgument("Shade.mix", args[0]);
                Base.extend(typeInfo, Tools.Vec.getType(cnt));

                if(!args[1].equals(args[0]))
                    Shade.throwError(result.node, "Shade.mix types of first two arguments do no match: got " + arg[0].getTypeString() +
                        " and " + arg[1].getTypeString() );
                if(!args[2].canNumber())
                    Shade.throwError(result.node, "Shade.mix third argument is not a number.");

                return typeInfo;
            }
        }
    };

    Base.extend(ns, {
        id: "Shade",
        object: {
            constructor: null,
            static: ShadeObject
        },
        instance: null

    });

}(exports));

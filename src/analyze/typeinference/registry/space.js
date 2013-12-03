(function (ns) {

    var Shade = require("../../../interfaces.js"),
        TYPES = Shade.TYPES,
        KINDS = Shade.OBJECT_KINDS;
        Base = require("../../../base/index.js"),
        Tools = require("./tools.js");


    var SpaceObject = {
        transformDirection: {
            type: TYPES.FUNCTION,
            evaluate: function (result, args, context, objectReference, root) {
                if (args.length != 2)
                    throw new Error("transformDirection expects 2 parameters.");
                return {
                    type: TYPES.OBJECT,
                    kind: KINDS.FLOAT3
                };
            }
        },
        transformPoint: {
            type: TYPES.FUNCTION,
            evaluate: function (result, args, context, objectReference, root) {
                if (args.length != 2)
                    throw new Error("transformPoint expects 2 parameters.");
                return {
                    type: TYPES.OBJECT,
                    kind: KINDS.FLOAT3
                };
            }
        },
        VIEW: { type: TYPES.NUMBER},
        WORLD: { type: TYPES.NUMBER}
    };

    Base.extend(ns, {
        id: "Space",
        object: {
            constructor: null,
            static: SpaceObject,
            staticValue: Math
        },
        instance: SpaceObject
    });


}(exports));

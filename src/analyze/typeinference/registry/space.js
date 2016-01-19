var Shade = require("../../../interfaces.js");
var TYPES = Shade.TYPES;

var SpaceObject = {
    transformDirection: {
        type: TYPES.FUNCTION,
        evaluate: function (result, args) {
            if (args.length != 2)
                throw new Error("transformDirection expects 2 parameters.");
            return {
                type: TYPES.OBJECT,
                kind: "Vec3"
            };
        }
    },
    transformPoint: {
        type: TYPES.FUNCTION,
        evaluate: function (result, args) {
            if (args.length != 2)
                throw new Error("transformPoint expects 2 parameters.");
            return {
                type: TYPES.OBJECT,
                kind: "Vec3"
            };
        }
    },
    VIEW: {type: TYPES.NUMBER},
    WORLD: {type: TYPES.NUMBER}
};

module.exports = {
    name: "Space",
    properties: SpaceObject
};

(function(ns){

    var Shade = require("../../../interfaces.js"),
        TYPES = Shade.TYPES,
        KINDS = Shade.OBJECT_KINDS,
        Base = require("../../../base/index.js"),
        Tools = require("./tools.js");

    var ShadeConstructor =  {
        type: TYPES.OBJECT,
        kind: KINDS.COLOR_CLOSURE,
        /**
         * @param {Annotation} result
         * @param {Array.<Annotation>} args
         * @param {Context} ctx
         */
        evaluate: function(result, args, context, objectReference, root) {
            if (args.length > 0)
                throw new Error("Shade.emission expects no parameters.");
            return {
                type: TYPES.OBJECT,
                kind: KINDS.COLOR_CLOSURE
            };
        }
    };

    var checkFirstArgumentIsColor = function(node, args, name) {
        if(!args.length || !args[0].canColor())
            Shade.throwError(node, "First argument of Shade." + name + " must evaluate to a color, found " + (args.length ? args[0].getTypeString() : "undefined"));
    };

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
            name: "diffuse",
            evaluate: function(result, args, context, objectReference, root) {
                checkFirstArgumentIsColor(result.node, args, this.name);
                var normal = args[1];
                if(!(normal && normal.canNormal())) {
                    Shade.throwError(result.node, "Second argument of Shade.diffuse must evaluate to a normal, but");
                }
                return {
                    type: TYPES.OBJECT,
                    kind: KINDS.COLOR_CLOSURE
                };
            }
        },
        phong: {
            type: TYPES.FUNCTION,
            name: "phong",
            evaluate: function(result, args, ctx) {
                checkFirstArgumentIsColor(result.node, args, this.name);

                var normal = args[1];
                if(!(normal && normal.canNormal())) {
                    throw new Error("Second argument (normal) of Shade.phong must evaluate to a normal");
                }

                if (args.length > 1) {
                    var shininess = args[2];
                    //console.log("Color: ", color.str(), color.getType(ctx));
                    if(!shininess.canNumber()) {
                        throw new Error("Third argument (shininess) of Shade.phong must evaluate to a number. Found: " + shininess.str());
                    }
                }
                return {
                    type: TYPES.OBJECT,
                    kind: KINDS.COLOR_CLOSURE
                };
            }
        }
    };

    Base.extend(ns, {
        id: "Shade",
        kind: KINDS.COLOR_CLOSURE,
        object: {
            constructor: ShadeConstructor,
            static: null
        },
        instance: ShadeObject

    });

}(exports));

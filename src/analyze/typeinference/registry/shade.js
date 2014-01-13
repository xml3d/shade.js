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

    var checkArgumentIsColor = function(node, args, position, name) {
        if(!args[position] || !args[position].canColor())
            Shade.throwError(node, "Argument "+ position + " of Shade." + name + " must evaluate to a color, found " + (args.length ? args[position].getTypeString() : "undefined"));
    };

    var checkArgumentIsNormal = function(node, args, position, name) {
        if(!args[position] || !args[position].canNormal())
            Shade.throwError(node, "Argument "+ position + " of Shade." + name + " must evaluate to a normal, found " + (args.length ? args[position].getTypeString() : "undefined"));
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
                checkArgumentIsColor(result.node, args, 0, this.name);
                checkArgumentIsNormal(result.node, args, 1, this.name);

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
                // TODO: Check arguments based on interface description
                checkArgumentIsColor(result.node, args, 0, this.name);
                checkArgumentIsNormal(result.node, args, 1, this.name);

                if (args.length > 2) {
                    var shininess = args[2];
                    if(!shininess.canNumber()) {
                        throw new Error("Third argument (shininess) of Shade.phong must evaluate to a number. Found: " + shininess.str());
                    }
                }

                return {
                    type: TYPES.OBJECT,
                    kind: KINDS.COLOR_CLOSURE
                };
            }
        },
        cookTorrance: {
            type: TYPES.FUNCTION,
            name: "cookTorrance",
            evaluate: function(result, args, ctx) {
                // TODO: Check arguments based on interface description
                checkArgumentIsColor(result.node, args, 0, this.name);
                checkArgumentIsNormal(result.node, args, 1, this.name);

                return {
                    type: TYPES.OBJECT,
                    kind: KINDS.COLOR_CLOSURE
                };
            }
        },
        ward: {
            type: TYPES.FUNCTION,
            name: "ward",
            evaluate: function(result, args, ctx) {
                // TODO: Check arguments based on interface description
                checkArgumentIsColor(result.node, args, 0, this.name);
                checkArgumentIsNormal(result.node, args, 1, this.name);
                checkArgumentIsNormal(result.node, args, 2, this.name);

                return {
                    type: TYPES.OBJECT,
                    kind: KINDS.COLOR_CLOSURE
                };
            }
        },
        reflect: {
            type: TYPES.FUNCTION,
            name: "reflect",
            evaluate: function(result, args, ctx) {
                // TODO: Check arguments based on interface description
                checkArgumentIsNormal(result.node, args, 0, this.name);

                return {
                    type: TYPES.OBJECT,
                    kind: KINDS.COLOR_CLOSURE
                };
            }
        },
        refract: {
            type: TYPES.FUNCTION,
            name: "refract",
            evaluate: function(result, args, ctx) {
                // TODO: Check arguments based on interface description
                checkArgumentIsNormal(result.node, args, 0, this.name);

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

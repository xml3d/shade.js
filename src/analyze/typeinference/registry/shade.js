(function(ns){

    var Shade = require("../../../interfaces.js"),
        TYPES = Shade.TYPES,
        KINDS = Shade.OBJECT_KINDS,
        Base = require("../../../base/index.js"),
        Annotations = require("../../../type-system/annotation.js");


    var ShadeConstructor =  {
        type: TYPES.OBJECT,
        kind: KINDS.COLOR_CLOSURE,
        /**
         * @param {Annotation} result
         * @param {Array.<Annotation>} args
         */
        evaluate: function(result, args) {
            if (args.length > 0)
                throw new Error("Shade constructor expects no parameters.");
            return {
                type: TYPES.OBJECT,
                kind: KINDS.COLOR_CLOSURE
            };
        }
    };

    var ShadeObject = {};

    Object.keys(Shade.ColorClosures).forEach(function (closureName) {
        var params = Shade.ColorClosures[closureName].input;
        ShadeObject[closureName] = {
            type: TYPES.FUNCTION, name: closureName, evaluate: function (result, args /*, context, objectReference, root */) {
                for (var i = 0; i < params.length; i++) {
                    var required = new Annotations.Annotation({}, params[i]);
                    if (i >= args.length) {
                        if (params[i].defaultValue != undefined) {
                            continue;
                        }
                        Shade.throwError(result.node, "Argument " + (i + 1) + " of Shade." + closureName + " is required but not given.");
                    } else {
                        // TODO(ksons): Need a more generic canCastTo method in type system
                        switch (params[i].semantic) {
                            case Shade.SEMANTICS.COLOR:
                                if (!args[i].canColor()) {
                                    Shade.throwError(result.node, "Argument " + (i + 1) + " of Shade." + closureName + " must evaluate to a color, found " + args[i].getTypeString());
                                }
                                break;
                            case Shade.SEMANTICS.NORMAL:
                                if (!args[i].canNormal()) {
                                    Shade.throwError(result.node, "Argument " + (i + 1) + " of Shade." + closureName + " must evaluate to a normal, found " + args[i].getTypeString());
                                }
                                break;
                            default:
                            // TODO(ksons): More type checks

                        }
                    }
                }
                return {
                    type: TYPES.OBJECT, kind: KINDS.COLOR_CLOSURE
                };

            }
        }
    });

    ShadeObject.mix = {
        type: TYPES.FUNCTION, name: "mix", evaluate: function () {
            return {
                type: TYPES.OBJECT, kind: KINDS.COLOR_CLOSURE
            };
        }

    };

    Base.extend(ns, {
        id: "Shade",
        kind: KINDS.COLOR_CLOSURE,
        object: {
            constructor: null,
            static: ShadeObject
        },
        instance: ShadeObject

    });



}(exports));

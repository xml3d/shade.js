(function(ns){

    var Shade = require("../../../interfaces.js"),
        TYPES = Shade.TYPES,
        KINDS = Shade.OBJECT_KINDS,
        Base = require("../../../base/index.js"),
        Annotation = require("../../../base/annotation.js").Annotation;

    var Vector2Constructor =  {
        type: TYPES.OBJECT,
        kind: KINDS.FLOAT2,
        /**
         * @param {Annotation} result
         * @param {Array.<Annotation>} args
         * @param {Context} ctx
         */
        evaluate: function(result, args, ctx) {
            throw new Error("Vector2 constructor not implemented yet.")
        }
    };


    var Vector2StaticObject = {
    };

    var Vector2Instance = {
        x: { type: TYPES.NUMBER },
        y: { type: TYPES.NUMBER }
    };


    Base.extend(ns, {
        id: "Vector2",
        kind: "float2",
        object: {
            constructor: Vector2Constructor,
            static: Vector2StaticObject
        },
        instance: Vector2Instance
    });


}(exports));

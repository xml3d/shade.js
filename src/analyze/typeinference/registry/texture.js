(function(ns){

    var Shade = require("../../../interfaces.js"),
        TYPES = Shade.TYPES,
        KINDS = Shade.OBJECT_KINDS,
        Tools = require("./tools.js");

    var TextureConstructor =  {
        type: TYPES.OBJECT,
        kind: KINDS.TEXTURE,
        /**
         * @param {Annotation} result
         * @param {Array.<Annotation>} args
         * @param {Context} ctx
         */
        evaluate: function(result, args, ctx) {
            Shade.throwError(result.node, "Construction of Textures is not supported." );
        }
    };

    var TextureStaticObject = {
    };

    var TextureInstance = {
        width: {
            type: TYPES.INT
        },
        height: {
            type: TYPES.INT
        }
    };

    Tools.Vec.attachVecMethods(TextureInstance, "Texture", 4, 2, ['sample2D']);

    Tools.extend(ns, {
        id: "Texture",
        kind: KINDS.TEXTURE,
        object: {
            constructor: TextureConstructor,
            static: TextureStaticObject
        },
        instance: TextureInstance
    });


}(exports));

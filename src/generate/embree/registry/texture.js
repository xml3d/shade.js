(function(ns){

    var Shade = require("../../../interfaces.js");
    var Syntax = require('estraverse').Syntax;
    var Tools = require("./tools.js");
    var ANNO = require("../../../type-system/annotation.js").ANNO;

    var TYPES = Shade.TYPES,
        KINDS = Shade.OBJECT_KINDS;

    var TextureInstance = {
        sample2D: {
            callExp: Tools.Vec.createFunctionCall.bind(null, 'texture2D', 2)
        }
    }

    Tools.extend(ns, {
        id: "Texture",
        kind: KINDS.TEXTURE,
        object: {
            constructor: null,
            static: {}
        },
        instance: TextureInstance
    });

}(exports));

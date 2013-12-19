(function (ns) {

    var common = require("../../../base/common.js");
    var Tools = require("../../tools.js");
    var VecBase = require("../../../base/vec.js");

    // Shortcuts
    var ANNO = common.ANNO, Syntax = common.Syntax;

    var Vec = {};

    Vec.createArrayAccess = function (object, index) {
        return {
            type: Syntax.MemberExpression,
            computed: true,
            object: object,
            property: {
                type: Syntax.Literal,
                value: index,
                extra: {
                    type: "int"
                }
            }
        };
    };

    Vec.createOSLSwizzle = function (vecCount, swizzle, node, args, parent) {
        var idx;
        if (args.length == 0) {
            if (swizzle.length == 1) {
                // Single access
                idx = VecBase.swizzleToIndex(swizzle.charAt(0));
                return Vec.createArrayAccess(node.callee.object, idx);
            }
            var indices = [];
            for(var i = 0; i < swizzle.length; ++i){
                idx = VecBase.swizzleToIndex(swizzle.charAt(i));
                indices[idx] = i;
            }
            if(indices.every(function(value, index, arr) {
                return index === 0 || arr[index-1] < arr[index];
            })) { // swizzles are in order ==> identity
                return node.callee.object;
            }

            var arguments = [];
             for(i = 0; i < swizzle.length; ++i){
                arguments.push(Vec.createArrayAccess(node.callee.object, indices[i]));
            }

            var replace = {
                type: Syntax.NewExpression,
                callee: {
                    type: Syntax.Identifier,
                    name: "Vec3"
                },
                arguments: arguments
            };
            ANNO(replace).copy(ANNO(node));
            return replace;
        }
        throw new Error("Soory, swizzle arguments not yet supported for OSL");

    }


    ns.Vec = Vec;

}(exports));

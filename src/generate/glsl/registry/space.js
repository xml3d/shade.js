(function(ns){

    var Shade = require("../../../interfaces.js");
    var Syntax = require('estraverse').Syntax;
    var Tools = require("../../tools.js");


    function getSpaceTransform(spaceArg, normal){
        if( spaceArg.type != Syntax.MemberExpression ||
            spaceArg.object.type != Syntax.Identifier ||
            spaceArg.object.name != "Space" ||
            spaceArg.property.type != Syntax.Identifier)
            Shade.throwError(spaceArg, "We only support Space enums for the first argument of transformDirection and transformPoint");

        switch(spaceArg.property.name){
            case "VIEW": return normal ? "modelViewMatrixN" : "modelViewMatrix";
            case "WORLD": return normal ? "modelMatrixN" : "modelMatrix";
            default: Shade.throwError(spaceArg, "Unknown Space Type: '" + spaceArg.property.name + "'");
        }
    }

    var ANNO = require("../../../base/annotation.js").ANNO;
    var TYPES = Shade.TYPES,
        KINDS = Shade.OBJECT_KINDS;
    var SpaceEntry  = {
        transformDirection: { callExp: function(callExpression, parent, context, state){
            var transform = getSpaceTransform(callExpression.arguments[0], true);
            var result = {  type: Syntax.BinaryExpression, operator: "*",
                            left: { type: Syntax.Identifier, name: transform},
                            right: callExpression.arguments[1]
            };

            ANNO(result).setType(TYPES.OBJECT, KINDS.FLOAT3);
            ANNO(result.left).setType(TYPES.OBJECT, KINDS.MATRIX3);
            ANNO(result.right).setType(TYPES.OBJECT, KINDS.FLOAT3);

            var systemName = Tools.getNameForSystem(transform);
            state.usedParameters.system[systemName] = state.systemParameters[transform];

            return result;
        } },
        transformPoint: { callExp: function(callExpression, parent, context, state){
            var transform = getSpaceTransform(callExpression.arguments[0], false);
            var result = {  type: Syntax.MemberExpression,
                            object: {  type: Syntax.BinaryExpression, operator: "*",
                                left: { type: Syntax.Identifier, name: transform},
                                right: {type: Syntax.CallExpression,
                                   callee: {type: Syntax.Identifier, name: "vec4"},
                                   arguments: [
                                        callExpression.arguments[1],
                                        { type: Syntax.Literal, value: 1, raw: 1}
                                   ]
                                }
                            },
                            property: { type: Syntax.Identifier, name: "xyz" }
                          };
            ANNO(result).setType(TYPES.OBJECT, KINDS.FLOAT3);
            ANNO(result.object).setType(TYPES.OBJECT, KINDS.FLOAT4);
            ANNO(result.object.left).setType(TYPES.OBJECT, KINDS.MATRIX4);
            ANNO(result.object.right).setType(TYPES.OBJECT, KINDS.FLOAT4);
            ANNO(result.object.right.arguments[1]).setType(TYPES.NUMBER);


            var systemName = Tools.getNameForSystem(transform);
            state.usedParameters.system[systemName] = state.systemParameters[transform];

            return result;
        } },
        VIEW: {
            property: function (memberExpression) {
                return memberExpression;
            }},
        WORLD: {
            property: function (memberExpression) {
                return  memberExpression;
            }}
    };

    Tools.extend(ns, {
        id: "Space",
        object: {
            constructor: null,
            static: SpaceEntry
        },
        instance: SpaceEntry
    });

}(exports));

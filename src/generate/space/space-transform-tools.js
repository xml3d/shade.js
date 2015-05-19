(function (ns) {

    var common = require("../../base/common.js"),
        Shade = require("./../../interfaces.js"),
        Types = Shade.TYPES,
        Kinds = Shade.OBJECT_KINDS,
        SpaceType = Shade.SpaceType,
        VectorType = Shade.VectorType;
    var walk = require('estraverse');
    var Syntax = walk.Syntax;
    var ANNO = common.ANNO;


    ns.getSpaceTransformCall = function(ast, space){
        var callExpression = {
            type: Syntax.CallExpression,
            callee: this.getSpaceConvertFunction(space),
            arguments: [ this.getSpaceConvertArg(space), ast ]
        };
        return callExpression;
    };

    ns.getSpaceConvertFunction = function(space){
        var vectorType = Shade.getVectorFromSpaceVector(space);
        var functionName;
        switch(vectorType){
            case VectorType.POINT: functionName = "transformPoint"; break;
            case VectorType.NORMAL: functionName = "transformDirection"; break;
        }
        var result = {
            type: Syntax.MemberExpression,
            object: {type: Syntax.Identifier, name: "Space"},
            property: { type: Syntax.Identifier, name: functionName }
        };
        ANNO(result).setType(Types.FUNCTION);
        ANNO(result.object).setType(Types.OBJECT, Kinds.ANY);
        return result;
    }

    ns.getSpaceConvertArg = function(space){
        var spaceType = Shade.getSpaceFromSpaceVector(space);
        var spaceName;
        switch(spaceType){
            case SpaceType.VIEW: spaceName = "VIEW"; break;
            case SpaceType.WORLD: spaceName = "WORLD"; break;
        }
        return {
            type: Syntax.MemberExpression,
            object: { type: Syntax.Identifier, name: "Space"  },
            property: { type: Syntax.Identifier, name: spaceName }
        };
    };


}(exports));

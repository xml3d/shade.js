(function (ns) {

    var Traversal = require('estraverse'),
        Syntax = Traversal.Syntax,
        parser = require('esprima');

    var Shade = require("../interfaces.js"),
    SpaceVectorType = Shade.SpaceVectorType,
    Types = Shade.TYPES,
    Kinds = Shade.OBJECT_KINDS;

    ns.getDefaultValue = function(ccInputDefinition){
        if(ccInputDefinition.defaultValue == undefined)
            throw new Error("ColorClosure input has not default value!");

        if(ccInputDefinition.type == Types.NUMBER || ccInputDefinition.type == Types.INT){
            var result = {
                type: Syntax.Literal,
                value: ccInputDefinition.defaultValue
            }
            return result;
        }
        else{
            throw new Error("Currentlty don't support default values of type " + ccInputDefinition.type + " and kind " + ccInputDefinition.kind);
        }
    }

}(exports));

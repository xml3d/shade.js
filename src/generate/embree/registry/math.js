(function(ns){

   var Shade = require("../../../interfaces.js");
   var Syntax = require('estraverse').Syntax;
   var Tools = require('./tools.js');

    var MathConstants = ["E", "PI", "LN2", "LOG2E", "LOG10E", "PI", "SQRT1_2", "SQRT2"];



    var handleIntVersion = function(node, parent) {
        parent.extra.type = Shade.TYPES.NUMBER;
        return Tools.removeMemberFromExpression(node);
    }


    var MathEntry  = {
        abs: { property: Tools.removeMemberFromExpression },
        acos: { property: Tools.removeMemberFromExpression },
        asin: { property: Tools.removeMemberFromExpression },
        atan: { property: Tools.removeMemberFromExpression },
        atan2: { property: function() { return { type: Syntax.Identifier, name: "atan" } }},
        ceil: { property: handleIntVersion },
        cos:  { property: Tools.removeMemberFromExpression },
        exp: { property: Tools.removeMemberFromExpression },
        floor: { property: handleIntVersion },
        // imul: { property: Tools.removeMemberFromExpression },
        log: { property: Tools.removeMemberFromExpression },
        max: { property: Tools.removeMemberFromExpression },
        min: { property: Tools.removeMemberFromExpression },
        pow: { property: Tools.removeMemberFromExpression },
        // random: function random() { [native code] }
        round: { property: Tools.removeMemberFromExpression }, // Since Embree 1.3, what does WebGL use?
        sin:  { property: Tools.removeMemberFromExpression },
        sqrt: { property: Tools.removeMemberFromExpression },
        tan: { property: Tools.removeMemberFromExpression }
    };

    MathConstants.forEach(function (constant) {
        MathEntry[constant] = {
            property: function () {
                return  { type: Syntax.Literal, value: Math[constant], extra: { type: Shade.TYPES.NUMBER } };
            }
        }
    });

    Tools.extend(ns, {
        id: "Math",
        object: {
            constructor: null,
            static: MathEntry
        },
        instance: MathEntry
    });

}(exports));

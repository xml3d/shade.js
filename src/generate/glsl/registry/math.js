(function(ns){

   var Shade = require("../../../interfaces.js");
   var Syntax = require('estraverse').Syntax;
   var Base = require("../../../base/index.js");

    var MathConstants = ["E", "PI", "LN2", "LOG2E", "LOG10E", "PI", "SQRT1_2", "SQRT2"];

    var removeMemberFromExpression = function(node) {
        return {
            type: Syntax.Identifier,
            name: node.property.name
        }
    }



    var MathEntry  = {
        abs: removeMemberFromExpression,
        acos: removeMemberFromExpression,
        asin: removeMemberFromExpression,
        atan: removeMemberFromExpression,
        atan2: function() { return { type: Syntax.Identifier, name: "atan" } },
        ceil: removeMemberFromExpression,
        cos:  removeMemberFromExpression,
        exp: removeMemberFromExpression,
        floor: removeMemberFromExpression,
        // imul: removeMemberFromExpression,
        log: removeMemberFromExpression,
        max: removeMemberFromExpression,
        min: removeMemberFromExpression,
        pow: removeMemberFromExpression,
        // random: function random() { [native code] }
        round: removeMemberFromExpression, // Since GLSL 1.3, what does WebGL use?
        sin:  removeMemberFromExpression,
        sqrt: removeMemberFromExpression,
        tan: removeMemberFromExpression
    };

    MathConstants.forEach( function(constant) {
        MathEntry[constant] = function() {
            return  { type: Syntax.Literal, value: Math[constant], extra: { type: Shade.TYPES.NUMBER } };
        }
    });

    Base.extend(ns, {
        id: "Math",
        object: {
            constructor: null,
            static: MathEntry
        },
        instance: MathEntry
    });

}(exports));

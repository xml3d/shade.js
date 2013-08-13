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
        abs: Tools.removeMemberFromExpression,
        acos: Tools.removeMemberFromExpression,
        asin: Tools.removeMemberFromExpression,
        atan: Tools.removeMemberFromExpression,
        atan2: function() { return { type: Syntax.Identifier, name: "atan" } },
        ceil: handleIntVersion,
        cos:  Tools.removeMemberFromExpression,
        exp: Tools.removeMemberFromExpression,
        floor: handleIntVersion,
        // imul: Tools.removeMemberFromExpression,
        log: Tools.removeMemberFromExpression,
        max: Tools.removeMemberFromExpression,
        min: Tools.removeMemberFromExpression,
        pow: Tools.removeMemberFromExpression,
        // random: function random() { [native code] }
        round: Tools.removeMemberFromExpression, // Since GLSL 1.3, what does WebGL use?
        sin:  Tools.removeMemberFromExpression,
        sqrt: Tools.removeMemberFromExpression,
        tan: Tools.removeMemberFromExpression
    };

    MathConstants.forEach( function(constant) {
        MathEntry[constant] = function() {
            return  { type: Syntax.Literal, value: Math[constant], extra: { type: Shade.TYPES.NUMBER } };
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

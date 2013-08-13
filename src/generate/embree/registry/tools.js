(function (ns) {

    var Syntax = require('estraverse').Syntax;
    var Base = require("../../../base/index.js");

    ns.removeMemberFromExpression = function (node) {
        return {
            type: Syntax.Identifier,
            name: node.property.name
        }
    }

    ns.extend = Base.extend;

}(exports));

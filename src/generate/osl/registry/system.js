(function (ns) {

    // Dependencies
    var Tools = require("../../tools.js");

    // Shortcuts


    var DerivedParameters = {
        fwidth: {
            property: function (node, parent, context, state) {
                var result = Tools.removeMemberFromExpression(node);
                result.name = "filterwidth";
                return result;
            }
        }

    };

    Tools.extend(ns, {
        id: "System",
        object: {
            constructor: null,
            static: DerivedParameters
        },
        instance: null,
        derivedParameters: DerivedParameters
    });
}(exports));

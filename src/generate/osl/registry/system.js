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
        },
        dx: {
            property: function (node, parent, context, state) {
                var result = Tools.removeMemberFromExpression(node);
                result.name = "Dx";
                return result;
            }
        },
        dy: {
            property: function (node, parent, context, state) {
                var result = Tools.removeMemberFromExpression(node);
                result.name = "Dy";
                return result;
            }
        },
        cameraPosition: {
            property: function (node, parent, context, state) {
                var result = Tools.removeMemberFromExpression(node);
                result.name = "I";
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

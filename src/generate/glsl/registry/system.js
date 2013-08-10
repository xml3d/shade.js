(function (ns) {

    var Base = require("../../../base/index.js");
    var Syntax = require('estraverse').Syntax;

    var SystemEntry = {
        coord: function(node) {
            return {
                    type: Syntax.Identifier,
                    name: "gl_FragCoord"
            };
        }
    };

    Base.extend(ns, {
        id: "System",
        object: {
            constructor: null,
            static: SystemEntry
        },
        instance: null
    });
}(exports));

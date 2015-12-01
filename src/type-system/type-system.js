var assert = require("assert");

var TypeSystem = (function () {
    var registry = new Map();
    var result = {
        registerPredefinedObject: function (definition) {
			assert(definition.name);
            registry.set(definition.name, definition);
        },

        getPredefinedObject: function (name) {
            var obj = registry.get(name);
            assert(obj, "Can't find object '" + name + "' in TypeSystem.");
            return obj;
        }
    };
    result.registerPredefinedObject(require("../analyze/typeinference/registry/math.js"));
	result.registerPredefinedObject(require("../analyze/typeinference/registry/vec2.js"));
	result.registerPredefinedObject(require("../analyze/typeinference/registry/vec3.js"));
	result.registerPredefinedObject(require("../analyze/typeinference/registry/vec4.js"));
    result.registerPredefinedObject(require("../analyze/typeinference/registry/system.js"));
    return result;
}());

module.exports = TypeSystem;

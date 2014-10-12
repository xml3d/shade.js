(function (ns) {

    var ColorClosureMarker = require("./colorclosure-marker.js");

    var c_implementations = {};

    var registerLightingImplementation = ns.registerLightingImplementation = function (name, obj) {
        c_implementations[name] = obj;
    };

    ns.resolveClosuresPreTypeInference = function (aast, implementationName, processingData, opt) {
        if (!implementationName) {
            return aast;
        }
        try {
            var resolverImpl = c_implementations[implementationName];
            if (resolverImpl.resolvePreTypeInference) {
                ColorClosureMarker.markColorClosures(aast);
                return resolverImpl.resolvePreTypeInference(aast, processingData, opt);
            } else
                return aast;
        } catch (e) {
            console.error(e);
        }
        return aast;
    };

    ns.resolveClosuresPostTypeInference = function (aast, implementationName, processingData, opt) {
        if (!implementationName) {
            return aast;
        }
        try {
            var resolverImpl = c_implementations[implementationName];
            if (resolverImpl.resolvePostTypeInference)
                return resolverImpl.resolvePostTypeInference(aast, processingData, opt); else
                return aast;
        } catch (e) {
            console.error(e);
        }
        return aast;
    };

    registerLightingImplementation("xml3d-glsl-forward", require("./xml3d-glsl-forward"));
    registerLightingImplementation("xml3d-glsl-deferred", require("./xml3d-glsl-deferred"));

}(exports));

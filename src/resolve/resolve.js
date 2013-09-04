(function(ns){

    var Implementations = {};
    Implementations["xml3d-glsl-forward"] = require("./xml3d-glsl-forward/");


    ns.resolveClosures = function(aast, implementationName, opt) {
        if(!implementationName) {
            return aast;
        }
        try {
           var resolverImpl = Implementations[implementationName];
           return resolverImpl.resolve(aast, opt);
        } catch(e) {
            console.error(e);
        }
        return aast;
    }

}(exports));

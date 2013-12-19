(function (ns) {

    ns.LightPassTemplate = function shade(env){
        var deferred0 = env.deferred0.sample2D(env.texcoord),
            deferred1 = env.deferred1.sample2D(env.texcoord),
            deferred2, deferred3, deferred4, deferred5, deferred6, deferred7;
        var ccId = deferred0.x();
        var position = deferred0.yzw();
        var ambientIntensity = deferred1.x();
    };

}(exports));
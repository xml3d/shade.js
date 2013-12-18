(function (ns) {

    ns.LightPassTemplate = function shade(env){
        var deferred0 = env.deferred1.sample2D(env.texcoord),
            deferred1 = env.deferred2.sample2D(env.texcoord),
            deferred2, deferred3, deferred4, deferred5, deferred6, deferred7;
        var ccId = deferred0.x();
        var position = deferred0.yzw();
        var ambientIntensity = deferred1.x();
    };

    var example = function(env){
        var deferred1 = env.deferred1.sample2D(env.texcoord),
            deferred2 = env.deferred2.sample2D(env.texcoord),
            deferred3, deferred4, deferred5, deferred6, deferred7, deferred8;
        var ccId = deferred1.x();
        var position = deferred1.yzw();
        var ambientIntensity = deferred2.x();
        var ccArg1, ccArg2, ccArg3, ccArg4, ccArg5, ccArg6, ccArg7;
        if(ccId == 0){
            deferred3 = env.deferred3.sample2D(env.texcoord);
            ccArg1 = deferred2.xyz();
            ccArg2 = deferred3.xyz();
            ccArg3 = deferred4.w();
            return new Shade().diffuse(ccArg1, ccArg2, ccArg3);
        }
        if(ccId == 1){
            deferred3 = env.deferred3.sample2D(env.texcoord);
            ccArg1 = deferred2.xyz();
            ccArg2 = deferred3.xyz();
            ccArg3 = deferred4.w();
            return new Shade().phong(ccArg1, ccArg2, ccArg3);
        }
    };

}(exports));
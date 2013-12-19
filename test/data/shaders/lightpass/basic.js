// Basic Light Pass Shader
{
    function shade(env) {
        return new Shade().phong(new Vec3(1,0.5,0), new Vec3(1, 0, 0), 0.5);
    }
}
// EXPECTED OUTPUT
{
    function shade(env) {
        var deferred0 = env.deferred0.sample2D(env.texcoord),
            deferred1 = env.deferred1.sample2D(env.texcoord),
            deferred2, deferred3, deferred4, deferred5, deferred6, deferred7;
        var ccId = deferred0.x();
        var position = deferred0.yzw();
        var ambientIntensity = deferred1.x();
        var ccArg0, ccArg1, ccArg2;
        if(ccId == 0){
            deferred2 = env.deferred2.sample2D(env.texcoord);
            ccArg0 = deferred2.xyz();
            ccArg1 = deferred1.yzw();
            ccArg2 = deferred2.w();
            return new Shade().phong(ccArg0, ccArg1, ccArg2);
        }
    }
}


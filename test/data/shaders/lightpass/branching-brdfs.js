// Basic deferred Shader
{
    function shade(env) {
        if(env.factor < 0.25)
            return new Shade().diffuse(new Vec3(1,1,0), new Vec3(1, 0, 0), 0.5);
        else if (env.factor > 0.75)
            return new Shade().diffuse(new Vec3(1,0,1), new Vec3(0, 0, 1), 0.5);
        else
            return new Shade().diffuse(new Vec3(1,1,0), new Vec3(1, 0, 0), 0.1).phong(new Vec3(1,0,0.5), new Vec3(1, 0, 0), 0.05);
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
        var ccArg0, ccArg1, ccArg2, ccArg3, ccArg4;
        if(ccId == 0){
            deferred2 = env.deferred2.sample2D(env.texcoord);
            ccArg0 = deferred2.xyz();
            ccArg1 = deferred1.yzw();
            ccArg2 = deferred2.w();
            return new Shade().diffuse(ccArg0, ccArg1, ccArg2);
        }
        if(ccId == 1){
            deferred2 = env.deferred2.sample2D(env.texcoord);
            deferred3 = env.deferred3.sample2D(env.texcoord);
            ccArg0 = deferred3.xyz();
            ccArg1 = deferred2.xyz();
            ccArg2 = deferred3.w();
            ccArg3 = deferred1.yzw();
            ccArg4 = deferred2.w();
            return new Shade().diffuse(ccArg0, ccArg1, ccArg2).phong(ccArg3, ccArg1, ccArg4);
        }
    }
}
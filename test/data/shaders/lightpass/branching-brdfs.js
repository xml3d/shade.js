// Branching Light Pass Shader
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
        var texcoord = this.normalizedCoords.xy();
        var deferred0 = env.deferred0.sample2D(texcoord),
            deferred1 = env.deferred1.sample2D(texcoord),
            deferred2, deferred3, deferred4, deferred5, deferred6, deferred7;
        var ccId = deferred0.x();
        var position = deferred0.yzw();
        var ambientIntensity = deferred1.x();

        if(ccId == 0){
            var cc0Arg0, cc0Arg1, cc0Arg2;
            deferred2 = env.deferred2.sample2D(texcoord);
            cc0Arg0 = deferred2.xyz();
            cc0Arg1 = deferred1.yzw();
            cc0Arg2 = deferred2.w();
            return new Shade().diffuse(cc0Arg0, cc0Arg1, cc0Arg2);
        }
        if(ccId == 1){
            var cc1Arg0, cc1Arg1, cc1Arg2, cc1Arg3, cc1Arg4;
            deferred2 = env.deferred2.sample2D(texcoord);
            deferred3 = env.deferred3.sample2D(texcoord);
            cc1Arg0 = deferred3.xyz();
            cc1Arg1 = deferred2.xyz();
            cc1Arg2 = deferred3.w();
            cc1Arg3 = deferred1.yzw();
            cc1Arg4 = deferred2.w();
            return new Shade().diffuse(cc1Arg0, cc1Arg1, cc1Arg2).phong(cc1Arg3, cc1Arg1, cc1Arg4);
        }
    }
}
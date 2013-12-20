// Basic Light Pass Shader
{
    function shade(env) {
        return new Shade().phong(new Vec3(1,0.5,0), new Vec3(1, 0, 0), 0.5);
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
            return new Shade().phong(cc0Arg0, cc0Arg1, cc0Arg2);
        }
    }
}


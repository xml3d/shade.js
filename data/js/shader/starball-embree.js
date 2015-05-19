function shade(env) {

    var dv = 0.005; // dv not supported yet
    var du = 0.005; // du not supported yet
    var ddv = 2.0 * Math.abs(dv);
    var ddu = 2.0 * Math.abs(du);

    var ang = (env.texcoord.s()*360.0) % 144.0;
    var ht = .3090 / Math.sin(((ang+18.0)*.01745));
    ang = ((1.0-env.texcoord.s())*360.0) % 144.0;
    var ht1 = .3090 / Math.sin(((ang+18.0)*.01745));
    ht = Math.max (ht, ht1);
    ht1 = ht*.5-Math.min(env.texcoord.t()*2.0, 1.0);
    ht1 = Math.clamp (ht1, -ddu, ddu)/(ddu*2.0)+.5;
    ht = ht/2.0 - Math.min((1.0-env.texcoord.t())*2.0, 1.0);
    ht1 = ht1 + Math.clamp(ht, -ddu, ddu)/(ddu*2.0)+.5;

    var ct = Math.mix (new Vec3(.8,.6,0.0), new Vec3 (.5,.05,.05), ht1);
    ct = Math.mix (new Vec3(0.0,0.2,.7), ct,
                   Math.clamp(Math.abs(env.texcoord.t()-0.5)-0.1, 0.0, ddv)/ddv);

    return new Shade().diffuse(ct, env.normal).phong(ct, env.normal, env.roughness);
}

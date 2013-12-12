// Two uniform expressions
/*
function shade(env) {
    var a, b;
    a = uexp.u1;
    b = uexp.u2;
    a = uexp.u3;
    return uexp.u4;
}
 */
function shade(env) {
    var a = Math.cos(-env.ufloat1);
    var b = Math.sin(env.ufloat2);
    a = a + b;
    return new Vec3(a);
}

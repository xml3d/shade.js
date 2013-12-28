// One uniform expressions
/*
function shade(env) {
    var a, b;
    a = uexp.u1;
    b = Math.sin(env.vfloat2);
    a = uexp.u1 + b;
    return new Vec3(a);
}
 */
/*
{
    "u1": {
        "code": "Math.cos(-env.ufloat1[0])",
        "dependencies": [ "ufloat1" ]
    }
}
 */
function shade(env) {
    var a = Math.cos(-env.ufloat1);
    var b = Math.sin(env.vfloat2);
    a = a + b;
    return new Vec3(a);
}

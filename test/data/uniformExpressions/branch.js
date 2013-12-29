// Uniform in branch
/*
function shade(env) {
    var a, b;
    a = uexp.u1;
    b = 5;
    if (env.ubool) {
        b = uexp.u2;
    }
    a = uexp.u1 + b;
    return new Vec3(a);
}
 */
/*
 {
     "u1": {
        "code": "Math.cos(-env.ufloat1[0])",
        "dependencies": [ "ufloat1" ]
     },
     "u2": {
        "code": "Math.sin(env.ufloat2[0])",
        "dependencies": [ "ufloat2" ]
     }
 }
 */
function shade(env) {
    var a = Math.cos(-env.ufloat1);
    var b = 5.0;
    if(env.ubool) {
        b = Math.sin(env.ufloat2);
    }
    a = a + b;
    return new Vec3(a);
}

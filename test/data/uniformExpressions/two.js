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
/*
 {
     "u1": {
        "code": "Math.cos(-env.ufloat1[0])",
        "dependencies": [ "ufloat1" ]
     },
     "u2": {
        "code": "Math.sin(env.ufloat2[0])",
        "dependencies": [ "ufloat2" ]
     },
     "u3": {
        "code": "Math.cos(-env.ufloat1[0]) + Math.sin(env.ufloat2[0])",
        "dependencies": [ "ufloat1", "ufloat2" ]
     },
    "u4": {
        "code": "new Shade.Vec3(Math.cos(-env.ufloat1[0]) + Math.sin(env.ufloat2[0]))",
        "dependencies": [ "ufloat1", "ufloat2" ]
     }


 }
 */
function shade(env) {
    var a = Math.cos(-env.ufloat1);
    var b = Math.sin(env.ufloat2);
    a = a + b;
    return new Vec3(a);
}

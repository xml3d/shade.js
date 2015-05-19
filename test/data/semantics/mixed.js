// Mixed semantics
/*
 {
 "env.normal": "normal",
 "env.branchColor": "color",
 "env.colorA": "color",
 "env.colorB": "color",
 "env.colorC": "color",
 "env.unknown": "unknown"
 }
 */
function shade(env) {

    var tangent;
    var diffuseColor2;

    if (env.bool) {
        diffuseColor2 = env.unknown;
    } else {
        tangent = env.unknown;
    }

    var mixedColor = Math.mix(env.colorA, Math.mix(env.colorB, env.colorC, env.f), env.f2);

    if (env.b) {
        mixedColor = env.branchColor;
    }

    var diffuseColor = env.notUsedAsDiffuseColor;

    diffuseColor = diffuseColor2 || mixedColor;

    var normal = env.normal ? env.normal.normalize() : tangent;

    return new Shade().diffuse(diffuseColor, normal);
}

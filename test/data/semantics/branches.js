// Consider both sides of branches
/*
{
    "env.diffuseColor": "color",
    "env.diffuseColor2": "color",
    "env.specularColor1": "color",
    "env.specularColor2": "color",
    "env.normal": "normal"
}
 */
function shade(env) {
    var diffuseColor = env.diffuseColor || env.diffuseColor2;
    var specularColor;
    if (env.bool) {
        specularColor = env.specularColor1;
    } else {
        specularColor = env.specularColor2;
    }
    var normal = env.normal || new Vec3(1);
    return new Shade().diffuse(diffuseColor, env.normal).phong(specularColor, normal);
}

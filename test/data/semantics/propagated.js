// Simple propagation of semantics
/*
{
    "env.diffuseColor": "color",
    "env.normal": "normal"
}
 */
function shade(env) {
    var diffuseColor = env.diffuseColor;
    var specularColor = new Vec3(1);
    var normal = env.normal || new Vec3(1);
    return new Shade().diffuse(diffuseColor, env.normal).phong(specularColor, normal);
}

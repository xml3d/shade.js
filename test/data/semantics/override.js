// No semantics for values that get overridden
/*
 {
 "env.diffuseColor": "color",
 "env.specularColor": "color",
 "env.normal": "normal"
 }
 */
function shade(env) {
    var diffuseColor = env.unreached;
    diffuseColor = env.diffuseColor;
    return new Shade().diffuse(diffuseColor, env.normal).phong(env.specularColor, env.normal);
}

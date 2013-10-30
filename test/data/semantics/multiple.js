// Multiple semantics lead to top element 'unknown'
/*
 {
 "env.specularColor": "unknown",
 "env.normal": "unknown"
 }
 */
function shade(env) {
    var normal = env.normal;
    return new Shade().diffuse(normal, normal).phong(env.specularColor, env.specularColor);
}

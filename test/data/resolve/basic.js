// Basic Forward
/*
function shade(env) {
    return diffuse(new Vec3(1), env.normal);
}
 */
function shade(env) {
    return Shade.diffuse(new Vec3(1), env.normal);
}

// Mix two closures
/*
function shade(env) {
    return Shade.mix(diffuse(new Vec3(1), new Vec3(0, 1, 0)), phong(new Vec3(1, 0.5, 0), new Vec3(1, 0, 0), 0.5), 0.5);
}
 */
function shade(env) {
    return Shade.mix(Shade.diffuse(new Vec3(1), new Vec3(0, 1, 0)), Shade.phong(new Vec3(1, 0.5, 0), new Vec3(1, 0, 0), 0.5), 0.5);
}

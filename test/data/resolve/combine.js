// Combine two closures
/*
function shade(env) {
    return diffuse_phong(new Vec3(1), new Vec3(0, 1, 0), new Vec3(1, 0.5, 0), new Vec3(1, 0, 0), 0.5);
}

 */
function shade(env) {
    return Shade.diffuse(new Vec3(1), new Vec3(0,1,0)).phong(new Vec3(1,0.5,0), new Vec3(1, 0, 0), 0.5);
}

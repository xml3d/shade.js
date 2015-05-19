/**
 * @param env Parameters from the current environment
 * @param env.texcoord {Point} Texture coordinates
 * @param env.frequency {number} Frequency of the checkerboard pattern
 * @param env.whiteColor {Color} Light color of the checkerboard
 * @param env.blackColor {Color} Dark color of the checkerboard
 * @param env.normal {Normal} Surface normal
 * @param env.shininess {number} Roughness of the surface
 * @return {*}
 */
function shade(env) {
    var color = new Vec3();
    var avgColor = Math.mix(env.whiteColor, env.blackColor, 0.5);
    var checkPos = Math.fract(env.texcoord.mul(env.frequency));

    if (this.fwidth) {
        var fw = this.fwidth(env.texcoord);
        var fuzz = fw.mul(env.frequency);
        var fuzzMax = Math.max(fuzz.x(), fuzz.y());

        if (fuzzMax < 0.4) {
            var p = Math.smoothstep(new Vec2(0.5), fuzz.add(0.5), checkPos);
            p = p.add(new Vec2(1).sub(Math.smoothstep(new Vec2(), fuzz, checkPos)));
            color = Math.mix(env.whiteColor, env.blackColor, p.x() * p.y() + (1.0 - p.x()) * (1.0 - p.y()));
            color = Math.mix(color, avgColor, Math.smoothstep(0.125, 0.5, fuzzMax));
        } else {
            color = avgColor;
        }
    } else {
        color = ((checkPos.x() < 0.5 && checkPos.y() < 0.5) || (checkPos.x() >= 0.5 && checkPos.y() >= 0.5)) ? env.whiteColor : env.blackColor;
    }


    return new Shade().diffuse(color, env.normal).phong(new Vec3(1), env.normal, env.shininess || 0);
}

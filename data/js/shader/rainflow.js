// Rainflow shader: https://www.shadertoy.com/view/XdsGzf
function shade(env) {
    //move the contour up or down based on our time and x-coordinate
    var sweep = Math.sin(env.time * .25) * Math.cos(this.coords.x() * 0.005);
    var px = this.coords.x() + this.coords.y() * (1.75 * sweep + 1.0) + this.width;

    var modAmount = (px/48) % 3;

    var tints0 = new Vec3(1, .5, .2);
    var tints1 = new Vec3(.3, .8, .4);
    var tints2 = new Vec3(.3, .6, 1);
    var tint = modAmount > 2 ? tints2 : (modAmount > 1) ? tints1 : tints0;
    return tint.mul(Shade.fract(modAmount));
}

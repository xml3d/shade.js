// Simple checkboard shader that works for texture coordinates
// or screen coordinates
function shade(env) {
    var x = env.texcoord ? env.texcoord.x() : this.coords.x();
    var y = env.texcoord ? env.texcoord.y() : this.coords.y();
    var f = env.frequency !== undefined ? env.frequency : 0.95;

    var  smod = Shade.fract(x * f),  tmod = Shade.fract(y * f);

    var color = ((smod < 0.5 && tmod < 0.5) || (smod >= 0.5 && tmod >= 0.5)) ?
        new Vec3(1) :
        new Vec3(0);

    return color;
}

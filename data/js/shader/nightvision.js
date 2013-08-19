// https://www.shadertoy.com/view/Xsl3zf
function hash(n) {
    return (Math.sin(n) * 43758.5453123) % 1;
}

function shade(env) {
    var p = this.normalizedCoords.xy().mul(2).sub(1);

    var n = p.x(this.width / this.height);

    if (Math.abs(p.y()) > .8 || Math.floor(this.normalizedCoords.y()) % 3.0 > 0.0) {
        return Color.black;
    }

    var c = env.channel0 ? env.channel0.sample2D(this.normalizedCoords) : Vec3(0);

    // flicker, grain, vignette, fade in
    c = c.add(Math.sin(hash(env.time)) * 0.01);
    c = c.add(hash((hash(n.x()) + n.y()) * env.time) * 0.4);
    c = c.mul(Shade.smoothstep(n.length() * 0.18, 0.8, 0.4));
    c = c.mul(1.9);
    c = c.mul(Shade.smoothstep(0.001, 3.5, env.time));

    var s = c.dot(0.2126, 0.7152, 0.0722);
    return new Vec3(0.2, 1.5 - hash(env.time) * 0.1, 0.4).mul(s);
}

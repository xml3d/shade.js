// https://www.shadertoy.com/view/Xsl3zf
function hash(n) {
    return Math.fract(Math.sin(n)*43758.5453123);
}

function shade(env) {
    var time = env.time || 10.0;
    var p = this.normalizedCoords.xy().mul(2).sub(1);

    var n = p.mul(this.width / this.height, 1.0);

    if (Math.abs(p.y()) > .8 || Math.floor(this.coords.y()) % 3.0 > 0.0) {
        return new Vec3(0);
    }

    var c = env.channel0 ? env.channel0.sample2D(this.normalizedCoords).xyz() : new Vec3(0,1,0);

    // flicker, grain, vignette, fade in
    c = c.add(Math.sin(hash(time)) * 0.01);
    c = c.add(hash((hash(n.x()) + n.y()) * time) * 0.4);
    c = c.mul(Math.smoothstep(n.mul(0.18).length(), 0.8, 0.4));
    c = c.mul(1.9);
    c = c.mul(Math.smoothstep(0.001, 3.5, time));

    var s = c.dot(0.2126, 0.7152, 0.0722);
    return new Vec3(0.2, 1.5 - hash(time) * 0.1, 0.4).mul(s);
}

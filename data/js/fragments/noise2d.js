function noiselayer(uv) {
    var f = Math.fract(uv);
    uv = Math.floor(uv);
    var v = uv.x() + uv.y() *1e3;
    var r = new Vec4(v, v+1, v+1e3, v+1e3+1);
    r = Math.fract(Math.sin(r.mul(1e-2)).mul(100000.0));
    f = f.mul(f).mul(new Vec2(3.0).sub(f.mul(2.0)));
    return (Math.mix(Math.mix(r.x(), r.y(), f.x()), Math.mix(r.z(), r.w(), f.x()), f.y()));
}

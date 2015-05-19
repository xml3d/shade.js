function mul(n) {
    return n*n;
}

function shade(env) {
    var f = this.normalizedCoords.x();
    f = mul(f);
    var g = mul(this.normalizedCoords.y());
    var i = 2;
    i = mul(i);
    var j = mul(i);
    return new Vec3(f,g,i/5);
}

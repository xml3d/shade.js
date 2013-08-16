function mul(n) {
    return n*n;
}

function shade(env) {
    var f = this.coords.x();
    f = mul(f);
    var g = mul(f);
    var i = 2;
    i = mul(i);
    var j = mul(i);
    return new Color(f,g,i,j);
}

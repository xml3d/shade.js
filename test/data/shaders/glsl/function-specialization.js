// Functions should specialize based on their parameter types
/*
int global_mul2 ( int n ) {
    return n * n;
}
float global_mul1 ( float n ) {
    return n * n;
}
void main ( void ) {
    float f = 2.0;
    f = global_mul1(f);
    float g = global_mul1(1.0);
    int i = 2;
    i = global_mul2(i);
    int j = global_mul2(i);
    gl_FragColor = vec4(vec3(f, g, i / 5), 1.0);
    return;
}
*/
function mul(n) {
    return n*n;
}

function shade(env) {
    var f = 2.0;
    f = mul(f);
    var g = mul(1.0);
    var i = 2;
    i = mul(i);
    var j = mul(i);
    return new Vec3(f,g,i/5);
}

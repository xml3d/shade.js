// Need to order function in execution order for GLSL
/*
float global_after2 ( int a ) {
    return a / 10;
}
float global_after1 ( float a ) {
    return a / float(10);
}
float global_before0 ( int a ) {
    return global_after1(a / 3);
}
void main ( void ) {
    gl_FragColor = vec4(vec3(global_before0(5), global_after2(2), global_before0(1)), 1.0);
    return;
}
*/

function before(a) {
    return after(a / 3);
}

function shade(env) {
    return new Vec3(before(5), after(2), before(1));
}

function after(a) {
    return a / 10;
}

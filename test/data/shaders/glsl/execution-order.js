// Need to order function in execution order for GLSL - obsolete, have forward declarations now
/*
// Forward declarations
float global_after3 ( int a );
float global_after2 ( float a );
float global_before1 ( int a );

float global_after3 ( int a ) {
    return a / 10;
}
float global_after2 ( float a ) {
    return a / float(10);
}
float global_before1 ( int a ) {
    return global_after2(a / 3);
}
void main ( void ) {
    gl_FragColor = vec4(vec3(global_before1(5), global_after3(2), global_before1(1)), 1.0);
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

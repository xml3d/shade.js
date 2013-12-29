// Forward declarations
/*
// Forward declarations
float global_after ( float a );
float global_before ( int a );
float global_after1 ( int a );

float global_after ( float a ) {
    return a / float(10);
}
float global_before ( int a ) {
    return global_after(a / 3);
}
float global_after1 ( int a ) {
    return a / 10;
}
void main ( void ) {
    gl_FragColor = vec4(vec3(global_before(5), global_after1(2), global_before(1)), 1.0);
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

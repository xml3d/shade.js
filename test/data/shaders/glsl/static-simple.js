// Propagation of static expressions
/*
void main ( void ) {
    float n = 1.0;
    gl_FragColor = vec4(vec3(1, 1, 1), 1.0);
    return;
}
 */
function shade(env) {
    var n = 1.0;
    return new Vec3(n);
}

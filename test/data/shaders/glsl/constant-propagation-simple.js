// Propagation of static expressions
/*
void main ( void ) {
    float n = 1.0;
    gl_FragColor = vec4(vec3(1.0), 1.0);
    return;
}
 */
function shade(env) {
    var n = -Math.cos(Math.PI);
    return new Vec3(n);
}

// Propagation of static expressions with branching
/*
uniform bool _env_ubool;
void main ( void ) {
    vec3 c;
    float a = 0.5;
    if(_env_ubool) {
        c = vec3(1);
    } else {
        c = vec3(0);
    }
    vec3 f = mix(c, vec3(1, 0, 0), 0.5);
    gl_FragColor = vec4(f, 1.0);
    return;
}
 */
function shade(env) {
    var c;
    var a = 0.5;
    if (env.ubool) {
        c = new Vec3(1);
    } else {
        c = new Vec3(0);
    }
    var f = Math.mix(c, new Vec3(1,0,0), a);
    return f;
}

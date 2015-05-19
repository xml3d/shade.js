// Shader with if statement
/*
uniform bool u1;
void main ( void ) {
    if(u1) {
        gl_FragColor = vec4(vec3(1), 1.0);
        return;
    }
    gl_FragColor = vec4(vec3(0), 1.0);
    return;
}
*/
function shade(env) {
    if (env.ufloat < 5.0) {
        return new Vec3(1)
    }
    return new Vec3(0);
}

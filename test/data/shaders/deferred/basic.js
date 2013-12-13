// Basic deferred Shader
/*
void main ( void ) {
    gl_FragColor[0] = vec4(vec3(1, 0, 0), 0.5);
    gl_FragColor[1] = vec4(vec3(1, 0.5, 0), 0);
    return;
}
*/
function shade(env) {
    return new Shade().phong(new Vec3(1,0.5,0), new Vec3(1, 0, 0), 0.5);
}

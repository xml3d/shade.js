// Shader with multiple return values
/*
void main ( void ) {
    gl_FragColor[0] = vec4(vec3(1, 1, 0), 1.0);
    gl_FragColor[1] = vec4(vec3(0, 0, 1), 1.0);
    return;
}
*/
function shade(env) {
    return [new Vec3(1,1,0), new Vec3(0,0,1)];
}

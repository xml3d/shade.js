// Basic deferred Shader
/*
uniform mat3 modelViewMatrixN;
uniform mat3 modelViewMatrix;
varying vec3 _env_position;
void main ( void ) {
    gl_FragColor[0] = vec4(0, ( modelViewMatrix * vec4(_env_position, 1.0) ).xyz);
    gl_FragColor[1] = vec4(0, modelViewMatrixN * vec3(1, 0, 0));
    gl_FragColor[2] = vec4(vec3(1, 0.5, 0), 0);
    return;
}
*/
function shade(env) {
    return new Shade().phong(new Vec3(1,0.5,0), new Vec3(1, 0, 0));
}

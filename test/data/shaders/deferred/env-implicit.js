// Env implict value usage
/*
uniform mat3 modelViewMatrixN;
uniform mat3 modelViewMatrix;
uniform float _env_ambientIntensity;
varying vec3 _env_position;
void main ( void ) {
    gl_FragData[0] = vec4(0, ( modelViewMatrix * vec4(_env_position, 1.0) ).xyz);
    gl_FragData[1] = vec4(_env_ambientIntensity, modelViewMatrixN * vec3(1, 0, 0));
    gl_FragData[2] = vec4(vec3(0, 0.5, 1), 0.8);
    return;
}
*/
function shade(env) {
    return new Shade().diffuse(new Vec3(0,0.5,1), new Vec3(1, 0, 0), 0.8);
}

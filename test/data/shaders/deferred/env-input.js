// Basic deferred Shader
/*
uniform mat3 modelViewMatrixN;
uniform mat3 modelViewMatrix;
uniform float _env_roughness;
uniform vec3 _env_diffuseColor;
varying vec3 _env_position;
varying vec3 _env_normal;
void main ( void ) {
    vec3 normal = _env_normal;
    gl_FragColor[0] = vec4(0, ( modelViewMatrix * vec4(_env_position, 1.0) ).xyz);
    gl_FragColor[1] = vec4(0, modelViewMatrixN * normal);
    gl_FragColor[2] = vec4(_env_diffuseColor, _env_roughness);
    return;
}
*/
function shade(env) {
    var normal = env.normal;
    return new Shade().phong(env.diffuseColor, normal, env.roughness);
}

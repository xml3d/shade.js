// Shader for system without derivatives
/*
uniform float _env_weight_2;
attribute vec3 _env_valueAdd_2;
varying vec3 _env_result;
uniform float _env_weight;
attribute vec3 _env_valueAdd;
attribute vec3 _env_value;
void main ( void ) {
    vec3 result_2;
    result_2 = ( _env_value + ( _env_valueAdd * vec3(_env_weight) ) );
    _env_result = ( result_2 + ( _env_valueAdd_2 * vec3(_env_weight_2) ) );
    gl_Position = vec4(_env_value, 1.0);
    return;
}
*/
function main(env) {
    var result_2;
    result_2 = env.value.add(env.valueAdd.mul(env.weight));
    env.result = result_2.add(env.valueAdd_2.mul(env.weight_2));
    return new Vec4(env.value,1.0);
}

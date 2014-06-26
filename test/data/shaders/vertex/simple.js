// Shader for system without derivatives
/*
attribute vec3 _env_value2;
attribute vec3 _env_value1;
varying vec3 _env_result;
void main ( void ) {
    _env_result = ( _env_value1 + _env_value2 );
}
*/
function main(env) {
    env.result = env.value1.add(env.value2);

}

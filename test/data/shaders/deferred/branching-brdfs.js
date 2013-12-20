// Branching deferred Shader
/*
uniform mat3 modelViewMatrixN;
uniform mat3 modelViewMatrix;
varying vec3 _env_position;
uniform Number _env_factor;
void main ( void ) {
    if(_env_factor < 0.25) {
        gl_FragData[0] = vec4(0, ( modelViewMatrix * vec4(_env_position, 1.0) ).xyz);
        gl_FragData[1] = vec4(0, modelViewMatrixN * vec3(1, 0, 0));
        gl_FragData[2] = vec4(vec3(1, 1, 0), 0.5);
        return;
    } else {
        if(_env_factor > 0.75) {
            gl_FragData[0] = vec4(0, ( modelViewMatrix * vec4(_env_position, 1.0) ).xyz);
            gl_FragData[1] = vec4(0, modelViewMatrixN * vec3(0, 0, 1));
            gl_FragData[2] = vec4(vec3(1, 0, 1), 0.5);
            return;
        } else {
            gl_FragData[0] = vec4(1, ( modelViewMatrix * vec4(_env_position, 1.0) ).xyz);
            gl_FragData[1] = vec4(0, vec3(1, 0, 0.5));
            gl_FragData[2] = vec4(modelViewMatrixN * vec3(1, 0, 0), 0.5);
            gl_FragData[3] = vec4(vec3(1, 1, 0), 0);
            return;
        }
    }
}
*/
function shade(env) {
    if(env.factor < 0.25)
        return new Shade().diffuse(new Vec3(1,1,0), new Vec3(1, 0, 0), 0.5);
    else if (env.factor > 0.75)
        return new Shade().diffuse(new Vec3(1,0,1), new Vec3(0, 0, 1), 0.5);
    else
        return new Shade().diffuse(new Vec3(1,1,0), new Vec3(1, 0, 0), 0.5).phong(new Vec3(1,0,0.5), new Vec3(1, 0, 0), 0.5);
}

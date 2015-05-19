// Shader for system with derivatives
/*
varying vec2 _env_texcoord;
void main ( void ) {
    vec2 fw = fwidth(_env_texcoord);
    gl_FragColor = vec4(vec3(fw.x), 1.0);
    return;
}
*/
function shade(env) {
    if (this.fwidth) {
        var fw = this.fwidth(env.texcoord);
        return new Vec3(fw.x());
    } else {
        return new Vec3(0);
    }
}

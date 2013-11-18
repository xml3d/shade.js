// Shader for system without derivatives
/*
void main ( void ) {
    gl_FragColor = vec4(vec3(0, 0, 0), 1.0);
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

// Functions should specialize also if parameters are undefined
/*
// Forward declarations
vec4 global_createVec ( float a, float c );

vec4 global_createVec ( float a, float c ) {
    return vec4(a, 2, c, 4);
}
void main ( void ) {
    gl_FragColor = global_createVec(0.1, 0.3);
    return;
}
*/
function createVec(a,b,c,d) {
    return new Vec4(
        a == undefined ? 1 : a,
        b == undefined ? 2 : b,
        c == undefined ? 3 : c,
        d == undefined ? 4 : d
    );
}

function shade(env) {
    return createVec(0.1, undefined, 0.3);
}

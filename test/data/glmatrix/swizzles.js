// Swizzles with glMatrix
/*
[
    { "type": "object", "kind": "float3" },
    { "type": "object", "kind": "float2" }
]
 */
{
    function main(a,b) {
        var res = a.yx(b).zyx();
        return res;
    }
}
// OUTPUT
{
    function main_glmatrix(a,b) {
        var vec2 = Shade.Math.vec2, vec3 = Shade.Math.vec3, vec4 = Shade.Math.vec4, mat3 = Shade.Math.mat3, mat4 = Shade.Math.mat4;
        var res = vec3.create(), _vec3Tmp0 = vec3.create();
        vec3.set(_vec3Tmp0, b[1], b[0], a[2]);
        vec3.set(res, _vec3Tmp0[2], _vec3Tmp0[1], _vec3Tmp0[0]);
        return res;
    }
}

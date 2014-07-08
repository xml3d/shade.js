// Basic glMatrix functionality
/*
[
    { "type": "object", "kind": "float3" },
    { "type": "object", "kind": "float3" }
]
 */
{
    function main(a,b) {
        var res = a.mul(b).div(2,3,1);
        return res;
    }
}
// OUTPUT
{
    function main_glmatrix(a,b) {
        var vec2 = Shade.Math.vec2, vec3 = Shade.Math.vec3, vec4 = Shade.Math.vec4, mat3 = Shade.Math.mat3, mat4 = Shade.Math.mat4;
        var res = vec3.create(), _vec3Tmp0 = vec3.create(), _vec3Tmp1 = vec3.create();
        vec3.mul(_vec3Tmp0, a, b);
        vec3.set(_vec3Tmp1, 2, 3, 1);
        vec3.div(res, _vec3Tmp0, _vec3Tmp1);
        return res;
    }
}

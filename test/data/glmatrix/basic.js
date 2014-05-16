// Env Space Propagation
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
        var res = vec3.create(), _vec3Tmp0 = vec3.create(), _vec3Tmp1 = vec3.create();
        vec3.mul(_vec3Tmp0, a, b);
        vec3.set(_vec3Tmp1, 2, 3, 1);
        vec3.div(res, _vec3Tmp0, _vec3Tmp1);
        return res;
    }
}

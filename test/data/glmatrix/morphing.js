// Morphing with glMatrix
/*
[
    { "type": "array", "elements" : { "type" : "object", "kind": "Vec3" } },
    { "type": "array", "elements" : { "type" : "object", "kind": "Vec3" } },
    { "type": "array", "elements" : { "type" : "object", "kind": "Vec3" } },
    { "type": "array", "elements" : { "type" : "number" } },
    { "type": "int" }
]
 */
{
    function main(res, value, valueAdd, weight, iterateCount) {
        var i = iterateCount;
        while(i--){
            var valueIt = value[i], valueAddIt = valueAdd[i], weightIt = weight[0];
            res[i] = valueIt.add(valueAddIt.mul(weightIt));
        }
    }
}
// OUTPUT
{
    function main_glmatrix(res, value, valueAdd, weight, iterateCount) {
        var vec2 = Shade.Math.vec2, vec3 = Shade.Math.vec3, vec4 = Shade.Math.vec4, mat3 = Shade.Math.mat3, mat4 = Shade.Math.mat4;
        var i, valueIt = vec3.create(), valueAddIt = vec3.create(), weightIt, _tmp0, _vec3Tmp0 = vec3.create();
        i = iterateCount;
        _tmp0 = i;
        i = _tmp0 - 1;
        while(_tmp0){
            vec3.copyArray(valueIt, value, i);
            vec3.copyArray(valueAddIt, valueAdd, i);
            weightIt = weight[0];
            vec3.set(_vec3Tmp0, weightIt, weightIt, weightIt);
            vec3.mul(_vec3Tmp0, valueAddIt, _vec3Tmp0);
            vec3.add(_vec3Tmp0, valueIt, _vec3Tmp0);
            vec3.pasteArray(res, i, _vec3Tmp0);
            _tmp0 = i;
            i = _tmp0 - 1;
        }
    }
}

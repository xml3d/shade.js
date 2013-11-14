// Semantic of basic BRDF parameters
/*
[
    { "extra": { "type": "object", "kind": "float3" } },
    { "extra": { "type": "object", "kind": "float3" } }
]
 */
/*
{
    "color" : ["OBJECT"],
    "n" : ["VIEW_NORMAL"]
}
 */
function shade(color, n) {
    var normal = this.transformNormal(Space.VIEW, n);
    return color.mul(normal.dot(1,0,0));
}


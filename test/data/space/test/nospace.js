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
    "n"     : ["OBJECT"]
}
 */
function shade(color, n) {
    return color.mul(n.dot(1,0,0));
}


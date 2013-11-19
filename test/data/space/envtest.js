// Env Space Propagation
/*
[
    {
        "extra": {
            "type": "object",
            "kind": "any",
            "global": true,
            "info": {
                "color" : { "type": "object", "kind": "float3" },
                "normal": { "type": "object", "kind": "float3" }
            }
        }
    }
]
 */
/*
{
    "env.color" : ["OBJECT"],
    "env.normal" : ["VIEW_NORMAL"]
}
 */
function shade(env42) {
    var normal;
    normal = this.transformNormal(Space.VIEW, env42.normal);
    return env42.color.mul(normal.dot(1,0,0));
}


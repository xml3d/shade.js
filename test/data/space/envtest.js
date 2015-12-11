// Env Space Propagation
/*
[
    {
        "extra": {
            "type": "object",
            "global": true,
            "properties": {
                "color" : { "type": "object", "kind": "Vec3" },
                "normal": { "type": "object", "kind": "Vec3" }
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
    normal = Space.transformDirection(Space.VIEW, env42.normal);
    return env42.color.mul(normal.dot(1,0,0));
}


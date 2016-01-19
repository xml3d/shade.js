// Env Space Propagation
/*
[
    {
        "extra": {
            "type": "object",
            "global": true,
            "properties" : {
                "color" : { "type": "object", "kind": "Vec3" },
                "normal1": { "type": "object", "kind": "Vec3" },
                "normal2": { "type": "object", "kind": "Vec3" },
                "weight": { "type": "number" }
            }
        }
    }
]
 */
/*
{
    "env.color" : ["OBJECT"],
    "env.normal1" : ["VIEW_NORMAL"],
    "env.normal2" : ["VIEW_NORMAL"]
}
 */
function shade(env) {
    var normal, viewNormal;
    normal = env.normal1.mul(1 - env.weight).add(env.normal2.mul(env.weight));
    viewNormal = Space.transformDirection(Space.VIEW, normal);
    return env.color.mul(viewNormal.dot(1,0,0));
}

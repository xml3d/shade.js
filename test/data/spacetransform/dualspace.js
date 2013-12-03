// Env Space Propagation
/*
{
    "color" : { "type": "object", "kind": "float3" },
    "normal": { "type": "object", "kind": "float3" }
}
 */
/*
{
    "color" : [{ "name" : "color", "space" : "OBJECT" }],
    "normal" : [{ "name" : "normal", "space" : "OBJECT" },
                { "name" : "normal_vns", "space" : "VIEW_NORMAL" }]
}
 */
{
    function shade(env) {
        var normal;
        normal = Space.transformDirection(Space.VIEW, env.normal);
        return env.color.mul(env.normal).mul(normal.dot(1,0,0));
    }
}
// OUTPUT
{
    function shade(env) {
        var normal;
        normal = env.normal_vns;
        return env.color.mul(env.normal).mul(normal.dot(1,0,0));
    }
}

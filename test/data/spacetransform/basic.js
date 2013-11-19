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
    "normal" : [{ "name" : "normal_vns", "space" : "VIEW_NORMAL" }]
}
 */
{
    function shade(env) {
        var normal;
        normal = this.transformNormal(Space.VIEW, env.normal);
        return env.color.mul(normal.dot(1,0,0));
    }
}
// OUTPUT
{
    function shade(env) {
        var normal;
        normal = env.normal_vns;
        return env.color.mul(normal.dot(1,0,0));
    }
}

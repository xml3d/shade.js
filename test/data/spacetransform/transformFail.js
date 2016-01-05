// Env Space Propagation
/*
{
    "color" : { "type": "object", "kind": "Vec3" },
    "normal": { "type": "object", "kind": "Vec3" }
}
 */
/*
{
    "color" : [{ "name" : "color", "space" : "OBJECT" }],
    "normal" : [{ "name" : "normal", "space" : "OBJECT" }]
}
 */
{
    function shade(env) {
        var normal;
        normal = env.normal;
        normal = normal.add(0,1,0);
        normal = Space.transformDirection(Space.VIEW, normal);
        return env.color.mul(normal.dot(1,0,0));
    }
}
// OUTPUT
{
    function shade(env) {
        var normal_vns, normal;
        normal = env.normal;
        normal_vns = Space.transformDirection(Space.VIEW, normal.add(0,1,0));
        normal = normal_vns;
        return env.color.mul(normal.dot(1,0,0));
    }
}

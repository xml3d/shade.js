// Env Space Propagation
/*
{
    "color" : { "type": "object", "kind": "float3" },
    "normal1": { "type": "object", "kind": "float3" },
    "normal2": { "type": "object", "kind": "float3" }
}
 */
/*
{
    "color" : [{ "name" : "color", "space" : "OBJECT" }],
    "normal1" : [{ "name" : "normal1", "space" : "OBJECT" }],
    "normal2" : [{ "name" : "normal2_vns", "space" : "VIEW_NORMAL" }]
}
 */
{
    function shade(env) {
        var N1, N2, fN, normal;
        N1 = env.normal1.add(0,1,0);
        N2 = env.normal2;
        fN = N1.add(N2);
        normal = Space.transformDirection(Space.VIEW, fN);
        return env.color.mul(normal.dot(1,0,0));
    }
}
// OUTPUT
{
    function shade(env) {
        var N1_vns, N2_vns, fN_vns, normal;
        N1_vns = Space.transformDirection(Space.VIEW, env.normal1.add(0,1,0));
        N2_vns = env.normal2_vns;
        fN_vns = N1_vns.add(N2_vns);
        normal = fN_vns;
        return env.color.mul(normal.dot(1,0,0));
    }
}

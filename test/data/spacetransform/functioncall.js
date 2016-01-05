// Env Space Propagation
/*
{
    "color" : { "type": "object", "kind": "Vec3" },
    "normal1": { "type": "object", "kind": "Vec3" },
    "normal2": { "type": "object", "kind": "Vec3" },
    "weight": { "type": "number" }
}
 */
/*
{
    "color" : [{ "name" : "color", "space" : "OBJECT" }],
    "normal1" : [{ "name" : "normal1_vns", "space" : "VIEW_NORMAL" }],
    "normal2" : [{ "name" : "normal2_vns", "space" : "VIEW_NORMAL" }]
}
 */
{
    function interpolateNormals(normal1, normal2, weight){
        return normal1.mul(1 - weight).add(normal2.mul(weight));
    }

    function shade(env) {
        var normal, viewNormal;
        normal = interpolateNormals(env.normal1, env.normal2, env.weight);
        viewNormal = Space.transformDirection(Space.VIEW, normal);
        return env.color.mul(viewNormal.dot(1,0,0));
    }
}
// OUTPUT
{
    function global_interpolateNormals(normal1, normal2, weight){
        return normal1.mul(1 - weight).add(normal2.mul(weight));
    }

    function shade(env) {
        var normal_vns, viewNormal;
        normal_vns = global_interpolateNormals(env.normal1_vns, env.normal2_vns, env.weight);
        viewNormal = normal_vns;
        return env.color.mul(viewNormal.dot(1,0,0));
    }
}

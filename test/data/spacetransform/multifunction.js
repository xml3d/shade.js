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
    function awesomeClosure(color, normal){
        var viewNormal;
        viewNormal = Space.transformDirection(Space.VIEW, normal);
        return color.mul(viewNormal.dot(1,0,0));
    }

    function shade(env) {
        var normal;
        normal = env.normal1.mul(1 - env.weight).add(env.normal2.mul(env.weight));
        return awesomeClosure(env.color, normal);
    }
}
// OUTPUT
{
    function global_awesomeClosure(color, normal_vns){
        var viewNormal;
        viewNormal = normal_vns;
        return color.mul(viewNormal.dot(1,0,0));
    }

    function shade(env) {
        var normal_vns;
        normal_vns = env.normal1_vns.mul(1 - env.weight).add(env.normal2_vns.mul(env.weight));
        return global_awesomeClosure(env.color, normal_vns);
    }
}

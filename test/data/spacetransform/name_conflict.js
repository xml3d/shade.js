// Name Conflict Handling
/*
{
    "color" : { "type": "object", "kind": "float3" },
    "normal": { "type": "object", "kind": "float3" },
    "normal_vns": { "type": "object", "kind": "float3" },
    "weight": { "type": "number" }
}
 */
/*
{
    "color" : [{ "name" : "color", "space" : "OBJECT" }],
    "normal" : [ { "name" : "normal_vns2", "space" : "VIEW_NORMAL" },
                  { "name" : "normal", "space" : "OBJECT" }],
    "normal_vns" : [{ "name" : "normal_vns_vns", "space" : "VIEW_NORMAL" }]
}
 */
{
    function awesomeClosure(color, normal){
        var viewNormal;
        viewNormal = this.transformNormal(Space.VIEW, normal);
        return color.mul(viewNormal.dot(1,0,0));
    }

    function shade(env) {
        var normal, normal_vns;
        normal_vns = env.normal;
        normal = env.normal.mul(1 - env.weight).add(env.normal_vns.mul(env.weight));
        return awesomeClosure(env.color.mul(normal_vns), normal);
    }
}
// OUTPUT
{
    function global_awesomeClosure1(color, normal_vns){
        var viewNormal;
        viewNormal = normal_vns;
        return color.mul(viewNormal.dot(1,0,0));
    }

    function shade(env) {
        var normal_vns2, normal_vns;
        normal_vns = env.normal;
        normal_vns2 = env.normal_vns2.mul(1 - env.weight).add(env.normal_vns_vns.mul(env.weight));
        return global_awesomeClosure1(env.color.mul(normal_vns), normal_vns2);
    }
}

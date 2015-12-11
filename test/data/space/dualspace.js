// Dual Space Propagations
/*
[
    { "extra": { "type": "object", "kind": "Vec3" } },
    { "extra": { "type": "object", "kind": "Vec3" } }
]
 */
/*
{
    "color" : ["OBJECT"],
    "n" : ["OBJECT","VIEW_NORMAL"]
}
 */
function shade(color, n) {
    var normal;
    normal = Space.transformDirection(Space.VIEW, n);
    return color.mul(n).mul(normal.dot(1,0,0));
}

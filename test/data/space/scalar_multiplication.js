// Space propagation with scalar multiplation
/*
[
    { "extra": { "type": "object", "kind": "Vec3" } },
    { "extra": { "type": "object", "kind": "Vec3" } }
]
 */
/*
{
    "color" : ["OBJECT"],
    "n" : ["VIEW_NORMAL"]
}
 */
function shade(color, n) {
    var normal;
    n = n.mul(2);
    normal = Space.transformDirection(Space.VIEW, n);
    return color.mul(normal.dot(1,0,0));
}


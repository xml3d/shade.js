// Semantic of basic BRDF parameters
/*
{
    "env.specularColor": "color",
    "env.diffuseColor": "color",
    "env.normal": "normal"
}

 */
function shade(color, n) {
    var b = n;
    b = new Vec3(1,2,3);
    n = b;
    var normal = this.transformNormal(Space.VIEW, n);
    return color.mul(normal.dot(1,0,0));
}
function shade(color, n) {
    var b = n;
    b = b.mul(2); // transfer: viewNormal|object // b => viewNormal|object
    n = b; // transfer: viewNormal   // b => viewNormal
    var normal = this.transformNormal(Space.VIEW, n); // // n =>  viewNormal
    return color.mul(normal.dot(1,0,0)); // // color => object, normal => object
}
// Converted: n => viewNormal
function shade(color, n) {
    var b = n;
    b = new Vec3(1,2,3); //
    n = b; // transfer: viewNormal   // b => viewNormal
    var normal = this.transformNormal(Space.VIEW, n); // // n =>  viewNormal
    return color.mul(normal.dot(1,0,0)); // // color => object, normal => object
}

function shade(color, n) {
    var b = n; // transfer: viewNormal|object, n => viewNormal|object
    b = b.mul(2); // transfer: viewNormal|object // b => viewNormal|object
    n = b; // transfer: viewNormal|object   // b => viewNormal|object
    var normal = this.transformNormal(Space.VIEW, n); //  // n =>  viewNormal|object
    return color.mul(n).mul(normal.dot(1,0,0)); // // color => object, normal => object, n => object
}
// Converted: n => object, n_viewspace => viewNormal
function shade(color, n, n_viewspace) {
    var b_viewspace;
    var b = n;
    b_viewspace = n_viewspace;
    b = b.mul(2);
    b_viewspace = b_viewspace.mul(2);
    n = b;
    n_viewspace = b_viewspace;
    var normal = n_viewspace;
    return color.mul(n).mul(normal.dot(1,0,0));
}


function shade(color, n){
    var normal1 = this.transformNormal(Space.WORLD, n.mul(this.transformNormal(Space.VIEW, n.mul(1,2,3)).dot(1,0,0))); // n => viewNormal|worldNormal|object
    n = this.transformNormal(Space.VIEW, n); //  || n => viewNormal
    return color.mul(n).mul(normal1.dot(1,0,0)).mul(n.dot(1,0,0)); //  || n => object, normal1 => object
}

function shade(color, n, n_world, n_view){
    var normal1 = n_world.mul( (normalViewMatrix * n.mul(1,2,3))*dot(1,0,0));
    n = n_view;
    return color.mul(n).mul(normal1)
}

function shade(color, n){
    var wNormal = this.transformNormal(Space.World, n); // n => viewNormal|viewSpace
    n = this.transformNormal(Space.View, n);    // n => viewNormal
    return color.mul(n).mul(wNormal)    // color => object, n => object, wNormal => object
}

function shade(color, n_view, n_world){
    var n;
    var wNormal = n_world; // n => viewNormal|viewSpace
    n = n_view;    // n => viewNormal
    return color.mul(n).mul(wNormal)    // color => object, n => object, wNormal => object
}


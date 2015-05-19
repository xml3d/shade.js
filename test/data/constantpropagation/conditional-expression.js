// Conditional Expression
/*
function shade(env) {
    var color = env.texcoord.x() < 0.5 ? new Vec3(1) : new Vec3(0);
    return color;
}
*/
function shade(env) {
   var color = (env.texcoord.x() < 0.5) ?
        new Vec3(1) : new Vec3( 0 );
   return color;
}


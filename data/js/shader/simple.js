function shade(env) {

    var diffuseColor = new Vec3(1,0,0);
    if(env.diffuseTexture) {
        diffuseColor.mul(env.diffuseTexture.sample(env.texcoord));
    }
    return diffuseColor;

}

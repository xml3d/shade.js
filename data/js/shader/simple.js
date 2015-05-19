function shade(env) {

    var diffuseColor = new Vec3(1,0,0);
    if(env.diffuseTexture) {
        diffuseColor = diffuseColor.mul(env.diffuseTexture.sample2D(env.texcoord));
    }
    return new Shade().diffuse(diffuseColor, env.normal);

}

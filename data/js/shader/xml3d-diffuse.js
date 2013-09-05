/**
 * Semantic of the standard diffuse shader in XML3D (urn:xml3d:shader:diffuse)
 * @param env
 */
function shade(env) {

    var transparency =  env.transparency || 0;
    var diffuseColor = env.diffuseColor || new Vec3(1);
    var emissiveColor = env.emissiveColor || new Vec3(0);

    if(env.diffuseTexture && env.texcoord) {
        var texDiffuse = env.diffuseTexture.sample(env.texcoord);
        diffuseColor = diffuseColor.mul(texDiffuse.rgb());
        transparency *= (1 - texDiffuse.a());
    }

    if(env.useVertexColor && env.color) {
        diffuseColor = diffuseColor.mul(env.color);
    }

    if (transparency > 0.95)
        return;

    if(env.emissiveTexture && env.texcoord) {
        emissiveColor = emissiveColor.mul(emissiveTexture.sample(env.texcoord).rgb());
    }

    return new Shade().emission(emissiveColor).diffuse(diffuseColor, env.normal).transparent(transparency);
}

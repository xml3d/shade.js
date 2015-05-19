// Semantic of basic BRDF parameters
/*
{
    "env.specularColor": "color",
    "env.diffuseColor": "color",
    "env.normal": "normal"
}

 */
function shade(env) {
    return new Shade().diffuse(env.diffuseColor, env.normal).phong(env.specularColor, env.normal);
}

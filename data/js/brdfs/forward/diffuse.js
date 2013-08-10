function diffuse(env, normal) {

    var intensity = new Color(0);

    for (var i = 0; i < env.MAX_POINTLIGHTS; i++) {
        if (!env.pointLightOn[i])
            continue;

        var lightVector = new Vector3();
        env.viewMatrix.transformPoint(env.pointLightPosition[i], lightVector);
        lightVector.sub(env.position);

        var dist = lightVector.length();
        lightVector.normalize();

        var atten = 1.0 / (env.pointLightAttenuation[i].x + env.pointLightAttenuation[i].y * dist + env.pointLightAttenuation[i].z * dist * dist);

        var diffuseColor = new Color();
        diffuseColor.scale(Math.max(env.normal.dot(lightVector), 0.0) * atten, env.pointLightIntensity[i]);
        intensity.add(diffuseColor);
    }
    return intensity;
}

/**
 * Created with JetBrains WebStorm.
 * User: lachsen
 * Date: 12/17/13
 * Time: 1:21 PM
 * To change this template use File | Settings | File Templates.
 */
(function (ns) {

ns.LightLoop = function LightLoop(position, ambientIntensity){
    var V = position.flip().normalize(), dist, atten;
    var kdComplete = new Vec3(0,0,0), ksComplete = new Vec3(0,0,0);
    if (this.MAX_POINTLIGHTS)
    for (var i = 0; i < this.MAX_POINTLIGHTS; i++) {
        if (!this.pointLightOn[i])
            continue;

        var L = this.viewMatrix.mulVec(this.pointLightPosition[i], 1.0).xyz();
        L = L.sub(position);
        dist = L.length();
        L = L.normalize();

        var kd = new Vec3(0,0,0), ks = new Vec3(0,0,0);
        "BRDF_ENTRY";

        atten = 1.0 / (this.pointLightAttenuation[i].x() + this.pointLightAttenuation[i].y() * dist + this.pointLightAttenuation[i].z() * dist * dist);
        kd = kd.mul(this.pointLightIntensity[i]).mul(atten);
        ks = ks.mul(this.pointLightIntensity[i]).mul(atten);
        kdComplete = kdComplete.add(kd);
        ksComplete = ksComplete.add(ks);
    }
    if (this.MAX_DIRECTIONALLIGHTS)
    for (i = 0; i < this.MAX_DIRECTIONALLIGHTS; i++) {
        if (!this.directionalLightOn[i])
            continue;

        L = this.viewMatrix.mulVec(this.directionalLightDirection[i], 0).xyz();
        L = L.flip().normalize();

        var kd = new Vec3(0,0,0), ks = new Vec3(0,0,0);
        "BRDF_ENTRY";

        kd = kd.mul(this.directionalLightIntensity[i]);
        ks = ks.mul(this.directionalLightIntensity[i]);
        kdComplete = kdComplete.add(kd);
        ksComplete = ksComplete.add(ks);
    }
    if (this.MAX_SPOTLIGHTS)
    for (i = 0; i < this.MAX_SPOTLIGHTS; i++) {
        if (this.spotLightOn[i]) {
            L = this.viewMatrix.mulVec(this.spotLightPosition[i], 1.0).xyz();
            L = L.sub(position);
            dist = L.length();
            L = L.normalize();

            var lDirection = this.viewMatrix.mulVec(this.spotLightDirection[i].flip(), 0).xyz().normalize();
            var angle = L.dot(lDirection);
            if(angle > this.spotLightCosFalloffAngle[i]) {
                var kd = new Vec3(0,0,0), ks = new Vec3(0,0,0);
                "BRDF_ENTRY";

                var c = 1.0;
                if (this.spotLightShadowMap.length && this.spotLightCastShadow[i]) {
                    var wpos = this.viewInverseMatrix.mulVec(position, 1.0).xyz();

                    var lsPos = this.spotLightMatrix[i].mulVec(new Vec4(wpos, 1));
                    var perspectiveDivPos = lsPos.xyz().div(lsPos.w()).mul(0.5).add(0.5);
                    var lsDepth = perspectiveDivPos.z() - this.spotLightShadowBias[i];

                    var lightuv = perspectiveDivPos.xy();
                    var bitShift = new Vec4( 1.0 / ( 256.0 * 256.0 * 256.0 ), 1.0 / ( 256.0 * 256.0 ), 1.0 / 256.0, 1.0 );

                    var texSize = new Vec2(Math.max(this.coords.x(), this.coords.y())).mul(2);
                    var texelSize = new Vec2(1.0, 1.0).div(texSize);
                    var f = Math.fract(lightuv.mul(texSize).add(0.5));
                    var centroidUV = Math.floor(lightuv.mul(texSize).add(0.5));
                    centroidUV = centroidUV.div(texSize);

                    var lb = this.spotLightShadowMap[i].sample2D(centroidUV.add(texelSize.mul(new Vec2(0.0, 0.0)))).dot(bitShift);
                    if (lb >= lsDepth)
                        lb = 1.0;
                    else
                        lb = 0.0;

                    var lt = this.spotLightShadowMap[i].sample2D(centroidUV.add(texelSize.mul(new Vec2(0.0, 1.0)))).dot(bitShift)
                    if (lt >= lsDepth)
                        lt = 1.0;
                    else
                        lt = 0.0;

                    var rb = this.spotLightShadowMap[i].sample2D(centroidUV.add(texelSize.mul(new Vec2(1.0, 0.0)))).dot(bitShift);
                    if (rb >= lsDepth)
                        rb = 1.0;
                    else
                        rb = 0.0;

                    var rt = this.spotLightShadowMap[i].sample2D(centroidUV.add(texelSize.mul(new Vec2(1.0, 1.0)))).dot(bitShift);
                    if (rt >= lsDepth)
                        rt = 1.0;
                    else
                        rt = 0.0;

                    var a = Math.mix(lb, lt, f.y());
                    var b = Math.mix(rb, rt, f.y());
                    c = Math.mix(a, b, f.x());
                }

                var softness = 1.0;
                if(angle < this.spotLightCosSoftFalloffAngle[i])
                    softness = (angle - this.spotLightCosFalloffAngle[i]) /
                        (this.spotLightCosSoftFalloffAngle[i] -  this.spotLightCosFalloffAngle[i]);

                atten = 1.0 / (this.spotLightAttenuation[i].x() + this.spotLightAttenuation[i].y() * dist + this.spotLightAttenuation[i].z() * dist * dist);
                kd = kd.mul(this.spotLightIntensity[i]).mul(atten * softness * c);
                ks = ks.mul(this.spotLightIntensity[i]).mul(atten * softness * c);
                kdComplete = kdComplete.add(kd);
                ksComplete = ksComplete.add(ks);
            }
        }
    }
    var ambientColor = new Vec3(0,0,0);
    "AMBIENT_ENTRY";
    kdComplete = kdComplete.add(ambientColor);
    var emissiveColor = new Vec3(0, 0, 0);
    "EMISSIVE_ENTRY"
    if (this.ssaoMap) {
        kdComplete = kdComplete.mul(1 - this.ssaoMap.sample2D(this.normalizedCoords).r());
    }
    var refractColor = new Vec3(0, 0, 0);
    var reflectColor = new Vec3(0, 0, 0);
    "REFRACT_REFLECT_ENTRY"
    return Math.pow(new Vec4(emissiveColor.add(kdComplete.add(ksComplete)).add(refractColor).add(reflectColor), 1.0), new Vec4(1/2.2));
}

}(exports));

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
        if (!this.spotLightOn[i])
            continue;

        L = this.viewMatrix.mulVec(this.spotLightPosition[i], 1.0).xyz();
        L = L.sub(position);
        dist = L.length();
        L = L.normalize();

        var lDirection = this.viewMatrix.mulVec(this.spotLightDirection[i].flip(), 0).xyz().normalize();
        var angle = L.dot(lDirection);
        if(angle > this.spotLightCosFalloffAngle[i]){

            var kd = new Vec3(0,0,0), ks = new Vec3(0,0,0);
            "BRDF_ENTRY";

            var softness = 1.0;
            if(angle < this.spotLightCosSoftFalloffAngle[i])
                softness = (angle - this.spotLightCosFalloffAngle[i]) /
                    (this.spotLightCosSoftFalloffAngle[i] -  this.spotLightCosFalloffAngle[i]);

            atten = 1.0 / (this.spotLightAttenuation[i].x() + this.spotLightAttenuation[i].y() * dist + this.spotLightAttenuation[i].z() * dist * dist);
            kd = kd.mul(this.spotLightIntensity[i]).mul(atten * softness);
            ks = ks.mul(this.spotLightIntensity[i]).mul(atten * softness);
            kdComplete = kdComplete.add(kd);
            ksComplete = ksComplete.add(ks);
        }
    }
    var ambientColor = new Vec3(0,0,0);
    "AMBIENT_ENTRY";
    kdComplete = kdComplete.add(ambientColor);

    return new Vec4(kdComplete.add(ksComplete), 1.0);

}

}(exports));

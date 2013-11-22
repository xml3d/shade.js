(function (ns) {


        /**
         * @param env Parameters from the current environment
         * @param {Vec3} normal
         */
        ns.diffuse = function diffuse(color, n, roughness) {
            var N = n.normalize();
            var V = _env.position.flip().normalize();
            var intensity = new Vec3();

            // If a roughness is defined we use Oren Nayar brdf.
            var a, b, NdotV, thetaOut, phiOut;
            var cosPhiDiff, alpha, beta;

            if (roughness > 0) {
                a = 1.0 - (roughness * roughness) / (2 * (roughness * roughness + 0.33));
                b = 0.45 * (roughness * roughness) / (roughness * roughness + 0.09);
                NdotV = Math.max(0, N.dot(V));
                thetaOut = Math.acos(NdotV);
                phiOut = V.sub(N.mul(NdotV)).normalize();
            }

            // Lambertian reflection is constant over the hemisphere.
            var brdf = 1.0;

            var L, dist, kd, atten;
            var thetaIn;
            var NdotL;

            if (this.MAX_POINTLIGHTS)
                for (var i = 0; i < this.MAX_POINTLIGHTS; i++) {
                    if (!this.pointLightOn[i])
                        continue;

                    L = this.viewMatrix.mulVec(this.pointLightPosition[i], 1.0).xyz();
                    L = L.sub(_env.position);
                    dist = L.length();
                    L = L.normalize();

                    NdotL = Math.max(0, N.dot(L));

                    if (roughness > 0) {
                        thetaIn = Math.acos(NdotL);
                        cosPhiDiff = phiOut.dot(L.sub(N.mul(NdotL)).normalize());
                        alpha = Math.max(thetaOut, thetaIn);
                        beta = Math.min(thetaOut, thetaIn);
                        brdf = (a + b * Math.max(0, cosPhiDiff) * Math.sin(alpha) * Math.tan(beta));
                    }

                    atten = 1.0 / (this.pointLightAttenuation[i].x() + this.pointLightAttenuation[i].y() * dist + this.pointLightAttenuation[i].z() * dist * dist);
                    kd = this.pointLightIntensity[i].mul(brdf * NdotL * atten);
                    intensity = intensity.add(kd);
                }
            if (this.MAX_DIRECTIONALLIGHTS)
                for (i = 0; i < this.MAX_DIRECTIONALLIGHTS; i++) {
                    if (!this.directionalLightOn[i])
                        continue;

                    L = this.viewMatrix.mulVec(this.directionalLightDirection[i], 0).xyz();
                    L = L.flip().normalize();

                    NdotL = Math.max(0, N.dot(L));

                    if (roughness > 0) {
                        thetaIn = Math.acos(NdotL);
                        cosPhiDiff = phiOut.dot(L.sub(N.mul(NdotL)).normalize());
                        alpha = Math.max(thetaOut, thetaIn);
                        beta = Math.min(thetaOut, thetaIn);
                        brdf = (a + b * Math.max(0, cosPhiDiff) * Math.sin(alpha) * Math.tan(beta));
                    }

                    kd = this.directionalLightIntensity[i].mul(brdf * NdotL);
                    intensity = intensity.add(kd);

                }
            if (this.MAX_SPOTLIGHTS)
                for (i = 0; i < this.MAX_SPOTLIGHTS; i++) {
                    if (!this.spotLightOn[i])
                        continue;

                    L = this.viewMatrix.mulVec(this.spotLightPosition[i], 1.0).xyz();
                    L = L.sub(_env.position);
                    dist = L.length();
                    L = L.normalize();

                    NdotL = Math.max(0, N.dot(L));

                    if (roughness > 0) {
                        thetaIn = Math.acos(NdotL);
                        cosPhiDiff = phiOut.dot(L.sub(N.mul(NdotL)).normalize());
                        alpha = Math.max(thetaOut, thetaIn);
                        beta = Math.min(thetaOut, thetaIn);
                        brdf = (a + b * Math.max(0, cosPhiDiff) * Math.sin(alpha) * Math.tan(beta));
                    }

                    var lDirection = this.viewMatrix.mulVec(this.spotLightDirection[i].flip(), 0).xyz().normalize();
                    var angle = L.dot(lDirection);
                    if(angle > this.spotLightCosFalloffAngle[i]){
                        var softness = 1.0;
                        if(angle < this.spotLightCosSoftFalloffAngle[i])
                            softness = (angle - this.spotLightCosFalloffAngle[i]) /
                                (this.spotLightCosSoftFalloffAngle[i] -  this.spotLightCosFalloffAngle[i]);

                        atten = 1.0 / (this.spotLightAttenuation[i].x() + this.spotLightAttenuation[i].y() * dist + this.spotLightAttenuation[i].z() * dist * dist);
                        kd = this.spotLightIntensity[i].mul(brdf * NdotL * atten * softness);
                        intensity = intensity.add(kd);
                    }
                }

            if(_env.ambientIntensity !== undefined)
                intensity = intensity.add(_env.ambientIntensity);

            return new Vec4(intensity.mul(color), 1.0);
        };

        ns.phong = function phong(color, n, shininess) {
            var N = n.normalize(), i, L, R, atten, kd, dist;
            var intensity = new Vec3();
            var eyeVector = _env.position.normalize();
            if(this.MAX_POINTLIGHTS)
                for (i = 0; i < this.MAX_POINTLIGHTS; i++) {
                    if (!this.pointLightOn[i])
                        continue;

                    L = this.viewMatrix.mulVec(this.pointLightPosition[i], 1.0).xyz();
                    L = L.sub(_env.position);
                    dist = L.length();
                    L = L.normalize();
                    R = L.reflect(N).normalize();
                    atten = 1.0 / (this.pointLightAttenuation[i].x() + this.pointLightAttenuation[i].y() * dist + this.pointLightAttenuation[i].z() * dist * dist);

                    kd = this.pointLightIntensity[i].mul(Math.pow(Math.max(R.dot(eyeVector),0.0), shininess*128.0) * atten);
                    intensity = intensity.add(kd);
                }
            if(this.MAX_DIRECTIONALLIGHTS)
                for (i = 0; i < this.MAX_DIRECTIONALLIGHTS; i++) {
                    if (!this.directionalLightOn[i])
                        continue;
                    L = this.viewMatrix.mulVec(this.directionalLightDirection[i], 0).xyz();
                    L = L.flip().normalize();
                    R = L.reflect(N).normalize();
                    kd = this.directionalLightIntensity[i].mul(Math.pow(Math.max(R.dot(eyeVector),0.0), shininess*128.0));
                    intensity = intensity.add(kd);
                }
            if(this.MAX_SPOTLIGHTS)
                for (i = 0; i < this.MAX_SPOTLIGHTS; i++) {
                    if (!this.spotLightOn[i])
                        continue;

                    L = this.viewMatrix.mulVec(this.spotLightPosition[i], 1.0).xyz();
                    L = L.sub(_env.position);
                    dist = L.length();
                    L = L.normalize();
                    R = L.reflect(N).normalize();

                    var lDirection = this.viewMatrix.mulVec(this.spotLightDirection[i].flip(), 0).xyz().normalize();
                    var angle = L.dot(lDirection);
                    if(angle > this.spotLightCosFalloffAngle[i]){
                        var softness = 1.0;
                        if(angle < this.spotLightCosSoftFalloffAngle[i])
                            softness = (angle - this.spotLightCosFalloffAngle[i]) /
                                (this.spotLightCosSoftFalloffAngle[i] -  this.spotLightCosFalloffAngle[i]);

                        atten = 1.0 / (this.spotLightAttenuation[i].x() + this.spotLightAttenuation[i].y() * dist + this.spotLightAttenuation[i].z() * dist * dist);
                        kd = this.spotLightIntensity[i].mul(Math.pow(Math.max(R.dot(eyeVector),0.0), shininess*128.0) * atten * softness);
                        intensity = intensity.add(kd);
                    }
                }
            return new Vec4(intensity.mul(color), 1.0);
        };

        ns.diffusephong = function phong(diffuseColor, phongColor, n, shininess) {
            var N = n.normalize();
            var diffuseIntensity = new Vec3(), phongIntensity = new Vec3();
            var eyeVector = _env.position.normalize();
            if(this.MAX_POINTLIGHTS)
                for (var i = 0; i < this.MAX_POINTLIGHTS; i++) {
                    if (!this.pointLightOn[i])
                        continue;

                    var L = this.viewMatrix.mulVec(this.pointLightPosition[i], 1.0).xyz();
                    L = L.sub(_env.position);
                    var dist = L.length();
                    L = L.normalize();
                    var R = L.reflect(N).normalize();
                    var atten = 1.0 / (this.pointLightAttenuation[i].x() + this.pointLightAttenuation[i].y() * dist + this.pointLightAttenuation[i].z() * dist * dist);

                    var kd = this.pointLightIntensity[i].mul(Math.max(N.dot(L), 0.0) * atten);
                    diffuseIntensity = diffuseIntensity.add(kd);
                    kd = this.pointLightIntensity[i].mul(Math.pow(Math.max(R.dot(eyeVector),0.0), shininess*128.0) * atten);
                    phongIntensity = phongIntensity.add(kd);
                }
            if(this.MAX_DIRECTIONALLIGHTS)
                for (var i = 0; i < this.MAX_DIRECTIONALLIGHTS; i++) {
                    if (!this.directionalLightOn[i])
                        continue;
                    var L = this.viewMatrix.mulVec(this.directionalLightDirection[i], 0).xyz();
                    L = L.flip().normalize();
                    var R = L.reflect(N).normalize();
                    var kd = this.directionalLightIntensity[i].mul(Math.max(N.dot(L), 0.0));
                    diffuseIntensity = diffuseIntensity.add(kd);
                    kd = this.directionalLightIntensity[i].mul(Math.pow(Math.max(R.dot(eyeVector),0.0), shininess*128.0));
                    phongIntensity = phongIntensity.add(kd);
                }
            if(this.MAX_SPOTLIGHTS)
                for (var i = 0; i < this.MAX_SPOTLIGHTS; i++) {
                    if (!this.spotLightOn[i])
                        continue;

                    var L = this.viewMatrix.mulVec(this.spotLightPosition[i], 1.0).xyz();
                    L = L.sub(_env.position);
                    var dist = L.length();
                    L = L.normalize();
                    var R = L.reflect(N).normalize();

                    var lDirection = this.viewMatrix.mulVec(this.spotLightDirection[i].flip(), 0).xyz().normalize();
                    var angle = L.dot(lDirection);
                    if(angle > this.spotLightCosFalloffAngle[i]){
                        var softness = 1.0;
                        if(angle < this.spotLightCosSoftFalloffAngle[i])
                            softness = (angle - this.spotLightCosFalloffAngle[i]) /
                                (this.spotLightCosSoftFalloffAngle[i] -  this.spotLightCosFalloffAngle[i]);

                        var atten = 1.0 / (this.spotLightAttenuation[i].x() + this.spotLightAttenuation[i].y() * dist + this.spotLightAttenuation[i].z() * dist * dist);
                        var kd = this.spotLightIntensity[i].mul(Math.max(N.dot(L), 0.0) * atten * softness);
                        diffuseIntensity = diffuseIntensity.add(kd);
                        kd = this.spotLightIntensity[i].mul(Math.pow(Math.max(R.dot(eyeVector),0.0), shininess*128.0) * atten * softness);
                        phongIntensity = phongIntensity.add(kd);
                    }
                }
            return new Vec4(diffuseIntensity.mul(diffuseColor).add(phongIntensity.mul(phongColor)), 1.0);
        };

        ns.cookTorrance = function cookTorrance(color, n, ior, roughness) {
            var N = n.normalize();
            var V = _env.position.flip().normalize();
            var intensity = new Vec3();

            var NdotV = Math.max(0, N.dot(V));


            // This is the so called Schlick's Approximation of the fresnel reflection coefficient.
            // R0 = n1 - n2 / n2 + n1 where n1 and n2 are the indices of refraction of the two media.
            // We set n1 = 1 the ior of air.
            var R0 = Math.pow((1 - ior) / (1 + ior), 2)
            var f = Math.max(0, R0 + (1 - R0) * Math.pow(1 - NdotV, 5));

            var L, H, dist, kd, atten;
            var NdotH, NdotL, HdotN, HdotL, HdotV;
            var brdf, alpha, numerator, denominator, d, G1, G2, g;

            if (this.MAX_POINTLIGHTS)
                for (var i = 0; i < this.MAX_POINTLIGHTS; i++) {
                    if (!this.pointLightOn[i])
                        continue;

                    L = this.viewMatrix.mulVec(this.pointLightPosition[i], 1.0).xyz();
                    L = L.sub(_env.position);
                    dist = L.length();
                    L = L.normalize();
                    H = V.add(L).normalize();

                    NdotH = Math.max(0, N.dot(H));
                    NdotL = Math.max(0, N.dot(L));
                    HdotN = Math.max(0, H.dot(N));
                    HdotL = Math.max(0, H.dot(L));
                    HdotV = Math.max(0, H.dot(V));

                    // Beckmann distribution
                    alpha = Math.acos(NdotH);
                    numerator = Math.exp(-Math.pow(Math.tan(alpha) / roughness, 2));
                    denominator = Math.pow(roughness, 2) * Math.pow(NdotH, 4);
                    d =  Math.max(0, numerator / denominator);

                    // Geometric attenuation
                    G1 = 2 * HdotN * NdotV / HdotV;
                    G2 = 2 * HdotN * NdotL / HdotV;
                    g =  Math.min(1, Math.max(0, Math.min(G1, G2)));

                    brdf = d * g * f / (Math.PI * NdotL * NdotV);

                    atten = 1.0 / (this.pointLightAttenuation[i].x() + this.pointLightAttenuation[i].y() * dist + this.pointLightAttenuation[i].z() * dist * dist);
                    kd = this.pointLightIntensity[i].mul(brdf * NdotL * atten);
                    intensity = intensity.add(kd);
                }
            if (this.MAX_DIRECTIONALLIGHTS)
                for (i = 0; i < this.MAX_DIRECTIONALLIGHTS; i++) {
                    if (!this.directionalLightOn[i])
                        continue;

                    L = this.viewMatrix.mulVec(this.directionalLightDirection[i], 0).xyz();
                    L = L.flip().normalize();
                    H = V.add(L).normalize();

                    NdotH = Math.max(0, N.dot(H));
                    NdotL = Math.max(0, N.dot(L));
                    HdotN = Math.max(0, H.dot(N));
                    HdotL = Math.max(0, H.dot(L));
                    HdotV = Math.max(0, H.dot(V));

                    // Beckmann distribution
                    alpha = Math.acos(NdotH);
                    numerator = Math.exp(-Math.pow(Math.tan(alpha) / roughness, 2));
                    denominator = Math.pow(roughness, 2) * Math.pow(NdotH, 4);
                    d =  Math.max(0, numerator / denominator);

                    // Geometric attenuation
                    G1 = 2 * HdotN * NdotV / HdotV;
                    G2 = 2 * HdotN * NdotL / HdotV;
                    g =  Math.min(1, Math.max(0, Math.min(G1, G2)));

                    brdf = d * g * f / (Math.PI * NdotL * NdotV);

                    kd = this.directionalLightIntensity[i].mul(brdf * NdotL);
                    intensity = intensity.add(kd);

                }
            if (this.MAX_SPOTLIGHTS)
                for (i = 0; i < this.MAX_SPOTLIGHTS; i++) {
                    if (!this.spotLightOn[i])
                        continue;

                    L = this.viewMatrix.mulVec(this.spotLightPosition[i], 1.0).xyz();
                    L = L.sub(_env.position);
                    dist = L.length();
                    L = L.normalize();
                    H = V.add(L).normalize();

                    NdotH = Math.max(0, N.dot(H));
                    NdotL = Math.max(0, N.dot(L));
                    HdotN = Math.max(0, H.dot(N));
                    HdotL = Math.max(0, H.dot(L));
                    HdotV = Math.max(0, H.dot(V));

                    // Beckmann distribution
                    alpha = Math.acos(NdotH);
                    numerator = Math.exp(-Math.pow(Math.tan(alpha) / roughness, 2));
                    denominator = Math.pow(roughness, 2) * Math.pow(NdotH, 4);
                    d =  Math.max(0, numerator / denominator);

                    // Geometric attenuation
                    G1 = 2 * HdotN * NdotV / HdotV;
                    G2 = 2 * HdotN * NdotL / HdotV;
                    g =  Math.min(1, Math.max(0, Math.min(G1, G2)));

                    brdf = d * g * f / (Math.PI * NdotL * NdotV);

                    var lDirection = this.viewMatrix.mulVec(this.spotLightDirection[i].flip(), 0).xyz().normalize();
                    var angle = L.dot(lDirection);
                    if(angle > this.spotLightCosFalloffAngle[i]){
                        var softness = 1.0;
                        if(angle < this.spotLightCosSoftFalloffAngle[i])
                            softness = (angle - this.spotLightCosFalloffAngle[i]) /
                                (this.spotLightCosSoftFalloffAngle[i] -  this.spotLightCosFalloffAngle[i]);

                        atten = 1.0 / (this.spotLightAttenuation[i].x() + this.spotLightAttenuation[i].y() * dist + this.spotLightAttenuation[i].z() * dist * dist);
                        kd = this.spotLightIntensity[i].mul(brdf * NdotL * atten * softness);
                        intensity = intensity.add(kd);
                    }
                }
            return new Vec4(color.mul(intensity), 1.0);
        };

}(exports));

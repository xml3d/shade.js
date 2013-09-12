(function (ns) {


        /**
         * @param env Parameters from the current environment
         * @param {Vec3} normal
         */
        ns.diffuse = function diffuse(color, n) {
            var N = n.normalize();
            var intensity = new Vec3();
            if(this.MAX_POINTLIGHTS)
                for (var i = 0; i < this.MAX_POINTLIGHTS; i++) {
                    if (!this.pointLightOn[i])
                        continue;

                    var L = this.viewMatrix.mulVec(this.pointLightPosition[i], 1.0).xyz();
                    L = L.sub(_env.position);
                    var dist = L.length();
                    L = L.normalize();

                    var atten = 1.0 / (this.pointLightAttenuation[i].x() + this.pointLightAttenuation[i].y() * dist + this.pointLightAttenuation[i].z() * dist * dist);

                    var kd = this.pointLightIntensity[i].mul(Math.max(N.dot(L), 0.0) * atten);
                    intensity = intensity.add(kd);
                }
            if(this.MAX_DIRECTIONALLIGHTS)
                for (var i = 0; i < this.MAX_DIRECTIONALLIGHTS; i++) {
                    if (!this.directionalLightOn[i])
                        continue;

                    var L = this.viewMatrix.mulVec(this.directionalLightDirection[i], 0).xyz();
                    L = L.flip().normalize();
                    var kd = this.directionalLightIntensity[i].mul(Math.max(N.dot(L), 0.0));
                    intensity = intensity.add(kd);
                }
            if(this.MAX_SPOTLIGHTS)
                for (var i = 0; i < this.MAX_SPOTLIGHTS; i++) {
                    if (!this.spotLightOn[i])
                        continue;

                    var L = this.viewMatrix.mulVec(this.spotLightPosition[i], 1.0).xyz();
                    L = L.sub(_env.position);
                    var dist = L.length();
                    L = L.normalize();

                    var lDirection = this.viewMatrix.mulVec(this.spotLightDirection[i].flip(), 0).xyz().normalize();
                    var angle = L.dot(lDirection);
                    if(angle > this.spotLightCosFalloffAngle[i]){
                        var softness = 1.0;
                        if(angle < this.spotLightCosSoftFalloffAngle[i])
                            softness = (angle - this.spotLightCosFalloffAngle[i]) /
                                (this.spotLightCosSoftFalloffAngle[i] -  this.spotLightCosFalloffAngle[i]);

                        var atten = 1.0 / (this.spotLightAttenuation[i].x() + this.spotLightAttenuation[i].y() * dist + this.spotLightAttenuation[i].z() * dist * dist);
                        var kd = this.spotLightIntensity[i].mul(Math.max(N.dot(L), 0.0) * atten * softness);
                        intensity = intensity.add(kd);
                    }
                }
            if(_env.ambientIntensity !== undefined)
                intensity = intensity.add(_env.ambientIntensity);
            return new Vec4(intensity.mul(color), 1.0);
        },

        ns.phong = function phong(color, n, shininess) {
            var N = n.normalize();
            var intensity = new Vec3();
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

                    var kd = this.pointLightIntensity[i].mul(Math.pow(Math.max(R.dot(eyeVector),0.0), shininess*128.0) * atten);
                    intensity = intensity.add(kd);
                }
            if(this.MAX_DIRECTIONALLIGHTS)
                for (var i = 0; i < this.MAX_DIRECTIONALLIGHTS; i++) {
                    if (!this.directionalLightOn[i])
                        continue;
                    var L = this.viewMatrix.mulVec(this.directionalLightDirection[i], 0).xyz();
                    L = L.flip().normalize();
                    var R = L.reflect(N).normalize();
                    var kd = this.directionalLightIntensity[i].mul(Math.pow(Math.max(R.dot(eyeVector),0.0), shininess*128.0));
                    intensity = intensity.add(kd);
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
                        var kd = this.spotLightIntensity[i].mul(Math.pow(Math.max(R.dot(eyeVector),0.0), shininess*128.0) * atten * softness);
                        intensity = intensity.add(kd);
                    }
                }
            return new Vec4(intensity.mul(color), 1.0);
        }

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
        }


}(exports));

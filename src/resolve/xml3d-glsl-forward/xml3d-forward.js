(function (ns) {


        /**
         * @param env Parameters from the current environment
         * @param {Vec3} normal
         */
        ns.diffuse = function diffuse(color, n) {
            var N = n.normalize();
            var intensity = new Vec3();
            for (var i = 0; i < this.MAX_POINTLIGHTS; i++) {
                if (!this.pointLightOn[i])
                    continue;

                var L = this.viewMatrix.mulVec(this.pointLightPosition[i]);
                L = L.sub(_env.position);

                var dist = L.length();
                var atten = 1.0 / (this.pointLightAttenuation[i].x() + this.pointLightAttenuation[i].y() * dist + this.pointLightAttenuation[i].z() * dist * dist);

                var kd = this.pointLightIntensity[i].mul(Math.max(N.dot(L.normalize()), 0.0) * atten);
                intensity = intensity.add(kd);
            }
            return new Vec4(intensity.mul(color), 1.0);
        },

        ns.phong = function phong(color, n, shininess) {
            return new Vec4(color, 1);
        }


}(exports));

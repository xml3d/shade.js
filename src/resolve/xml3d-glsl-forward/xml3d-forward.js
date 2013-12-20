(function (ns) {

        ns.diffuse = {

            getDiffuse: function getDiffuse(L, V, color, N, roughness){
                // If a roughness is defined we use Oren Nayar brdf.
                var a, b, NdotV, thetaOut, phiOut, thetaIn;
                var cosPhiDiff, alpha, beta;
                var NdotL = Math.saturate(N.dot(L));

                // Lambertian reflection is constant over the hemisphere.
                var brdf = 1.0;

                if (roughness > 0) {
                    a = 1.0 - (roughness * roughness) / (2 * (roughness * roughness + 0.33));
                    b = 0.45 * (roughness * roughness) / (roughness * roughness + 0.09);
                    NdotV = N.dot(V);
                    thetaOut = Math.acos(NdotV);
                    phiOut = V.sub(N.mul(NdotV)).normalize();
                    thetaIn = Math.acos(NdotL);
                    cosPhiDiff = phiOut.dot(L.sub(N.mul(NdotL)).normalize());
                    alpha = Math.max(thetaOut, thetaIn);
                    beta = Math.min(thetaOut, thetaIn);
                    brdf = (a + b * Math.saturate(cosPhiDiff) * Math.sin(alpha) * Math.tan(beta));
                }
                brdf *= NdotL;
                return color.mul(brdf);
            },

            getAmbient: function getAmbient(ambientIntensity, color, N, roughness){
                return color.mul(ambientIntensity);
            }
        };

        ns.phong = {
            getSpecular: function getSpecular(L, V, color, N, shininess){
                var R = L.reflect(N).normalize();
                var eyeVector = V.flip();
                return color.mul(Math.pow(Math.max(R.dot(eyeVector),0.0), shininess*128.0));
            }
        };

        ns.cookTorrance = {
            getSpecular: function getSpecular(L, V, color, N, ior, roughness){
                var R0 = Math.pow((1 - ior) / (1 + ior), 2);
                var H = V.add(L).normalize(),
                    NdotH = N.dot(H),
                    NdotL = Math.saturate(N.dot(L)),
                    HdotN = H.dot(N),
                    HdotL = H.dot(L),
                    HdotV = H.dot(V),
                    NdotV = N.dot(V);

                // Beckmann distribution
                var alpha = Math.acos(NdotH),
                    numerator = Math.exp(-Math.pow(Math.tan(alpha) / roughness, 2)),
                    denominator = Math.pow(roughness, 2) * Math.pow(NdotH, 4),
                    d =  Math.max(0, numerator / denominator);

                // Geometric attenuation
                var G1 = 2 * HdotN * NdotV / HdotV,
                    G2 = 2 * HdotN * NdotL / HdotV,
                    g =  Math.min(1, Math.max(0, Math.min(G1, G2))),
                    f = Math.max(0, R0 + (1 - R0) * Math.pow(1 - NdotH, 5));

                var brdf = d * g * f / (Math.PI * NdotV);
                return color.mul(brdf);
            }
        };

        ns.ward = {
            getSpecular: function getSpecular(L, V, color, N, T, ax, ay){
                ax += 1e-5;
                ay += 1e-5;
                var NdotL = Math.saturate(N.dot(L));
                var NdotH = N.dot(H);
                var HdotT = H.dot(T);
                var HdotB = H.dot(B);

                var first = 1 / (4 * Math.PI * ax * ay * Math.sqrt(NdotL * NdotV));
                var beta = -(Math.pow(HdotT / ax, 2) + Math.pow(HdotB / ay, 2)) / (NdotH * NdotH);
                var second = Math.exp(beta);
                var brdf = Math.max(0, first * second) * NdotL;

                return color.mul(brdf);
            }
        };

        ns.scatter = {
            getSpecular: function getSpecular(L, V, color, N, wrap, scatterWidth){
                var NdotL = Math.saturate(N.dot(L));

                var NdotLWrap = (NdotL + wrap) / (1 + wrap);
                var scatter = Math.smoothstep(0.0, scatterWidth, NdotLWrap) * Math.smoothstep(scatterWidth * 2.0, scatterWidth, NdotLWrap);

                return color.mul(scatter);
            }
        };

}(exports));

// Many uniforms, paper shader
/*
function shade(env) {
    var colorA, colorB, colorC, colorD, colorA2, colorB2, colorC2, colorD2, t1, t2, t3, t4, fullWeight, subColor1, subColor2, finalT, finalColor, colorWeight;
    colorA = uexp.u1;
    colorB = uexp.u2;
    colorC = uexp.u3;
    colorD = uexp.u4;
    colorA2 = uexp.u5;
    colorB2 = uexp.u6;
    colorC2 = uexp.u7;
    colorD2 = uexp.u8;
    t1 = uexp.u9;
    t2 = uexp.u10;
    t3 = uexp.u11;
    t4 = uexp.u12;
    t4 = uexp.u13;
    t4 *= uexp.u14;
    fullWeight = uexp.u15;
    subColor1 = uexp.u16;
    subColor1 = uexp.u17;
    subColor1 = uexp.u18;
    subColor1 = uexp.u19;
    subColor1 = uexp.u20;
    subColor2 = uexp.u21;
    subColor2 = uexp.u22;
    subColor2 = uexp.u23;
    subColor2 = uexp.u24;
    subColor2 = uexp.u25;
    finalT = uexp.u26;
    finalColor = uexp.u27;
    colorWeight = Math.cos(env.texcoord.y() * 20) + Math.sin(env.texcoord.x() * 20);
    return uexp.u27.mul(colorWeight * colorWeight * colorWeight);
}
 */
/*
{"u1": {
    "code": "new Shade.Mat4(new Shade.Mat4(env.ucolorTransform1)).mulVec(new Shade.Vec3(new Shade.Vec3(env.ucolorA)), 1).xyz()",
    "dependencies": [null, "ucolorA", "ucolorTransform1"]
}, "u2": {
    "code": "new Shade.Mat4(new Shade.Mat4(env.ucolorTransform1)).mulVec(new Shade.Vec3(new Shade.Vec3(env.ucolorB)), 1).xyz()",
    "dependencies": [null, "ucolorB", "ucolorTransform1"]
}, "u3": {
    "code": "new Shade.Mat4(new Shade.Mat4(env.ucolorTransform1)).mulVec(new Shade.Vec3(new Shade.Vec3(env.ucolorC)), 1).xyz()",
    "dependencies": [null, "ucolorC", "ucolorTransform1"]
}, "u4": {
    "code": "new Shade.Mat4(new Shade.Mat4(env.ucolorTransform1)).mulVec(new Shade.Vec3(new Shade.Vec3(env.ucolorD)), 1).xyz()",
    "dependencies": [null, "ucolorD", "ucolorTransform1"]
}, "u5": {
    "code": "new Shade.Mat4(new Shade.Mat4(env.ucolorTransform2)).mulVec(new Shade.Vec3(new Shade.Vec3(env.ucolorA)), 1).xyz()",
    "dependencies": [null, "ucolorA", "ucolorTransform2"]
}, "u6": {
    "code": "new Shade.Mat4(new Shade.Mat4(env.ucolorTransform2)).mulVec(new Shade.Vec3(new Shade.Vec3(env.ucolorB)), 1).xyz()",
    "dependencies": [null, "ucolorB", "ucolorTransform2"]
}, "u7": {
    "code": "new Shade.Mat4(new Shade.Mat4(env.ucolorTransform2)).mulVec(new Shade.Vec3(new Shade.Vec3(env.ucolorC)), 1).xyz()",
    "dependencies": [null, "ucolorC", "ucolorTransform2"]
}, "u8": {
    "code": "new Shade.Mat4(new Shade.Mat4(env.ucolorTransform2)).mulVec(new Shade.Vec3(new Shade.Vec3(env.ucolorD)), 1).xyz()",
    "dependencies": [null, "ucolorD", "ucolorTransform2"]
}, "u9": {
    "code": "(1 + Math.cos(env.time[0] / 2)) / 2",
    "dependencies": ["time"]
}, "u10": {
    "code": "(1 + Math.sin(env.time[0])) / 2",
    "dependencies": ["time"]
}, "u11": {
    "code": "(1 + Math.cos(env.time[0] * 2)) / 2",
    "dependencies": ["time"]
}, "u12": {
    "code": "(1 + Math.cos(env.time[0] / 10)) / 2",
    "dependencies": ["time"]
}, "u13": {
    "code": "Math.pow((1 + Math.cos(env.time[0] / 10)) / 2, 5)",
    "dependencies": ["time"]
}, "u14": {
    "code": "(1 + Math.cos(env.time[0] * 20)) / 2",
    "dependencies": ["time"]
}, "u15": {
    "code": "(1 + Math.cos(env.time[0] / 2)) / 2 + (1 + Math.sin(env.time[0])) / 2 + (1 + Math.cos(env.time[0] * 2)) / 2 + (1 + Math.cos(env.time[0] * 20)) / 2",
    "dependencies": ["time"]
}, "u16": {
    "code": "new Shade.Mat4(new Shade.Mat4(new Shade.Mat4(env.ucolorTransform1))).mulVec(new Shade.Vec3(new Shade.Vec3(new Shade.Vec3(env.ucolorA))), 1).xyz().mul((1 + Math.cos(env.time[0] / 2)) / 2)",
    "dependencies": ["time", null, "ucolorA", "ucolorTransform1"]
}, "u17": {
    "code": "new Shade.Mat4(new Shade.Mat4(new Shade.Mat4(new Shade.Mat4(env.ucolorTransform1)))).mulVec(new Shade.Vec3(new Shade.Vec3(new Shade.Vec3(new Shade.Vec3(env.ucolorA)))), 1).xyz().mul((1 + Math.cos(env.time[0] / 2)) / 2).add(new Shade.Mat4(new Shade.Mat4(new Shade.Mat4(env.ucolorTransform1))).mulVec(new Shade.Vec3(new Shade.Vec3(new Shade.Vec3(env.ucolorB))), 1).xyz().mul((1 + Math.sin(env.time[0])) / 2))",
    "dependencies": ["time", null, "ucolorB", "ucolorTransform1", "ucolorA"]
}, "u18": {
    "code": "new Shade.Mat4(new Shade.Mat4(new Shade.Mat4(new Shade.Mat4(new Shade.Mat4(env.ucolorTransform1))))).mulVec(new Shade.Vec3(new Shade.Vec3(new Shade.Vec3(new Shade.Vec3(new Shade.Vec3(env.ucolorA))))), 1).xyz().mul((1 + Math.cos(env.time[0] / 2)) / 2).add(new Shade.Mat4(new Shade.Mat4(new Shade.Mat4(new Shade.Mat4(env.ucolorTransform1)))).mulVec(new Shade.Vec3(new Shade.Vec3(new Shade.Vec3(new Shade.Vec3(env.ucolorB)))), 1).xyz().mul((1 + Math.sin(env.time[0])) / 2)).add(new Shade.Mat4(new Shade.Mat4(new Shade.Mat4(env.ucolorTransform1))).mulVec(new Shade.Vec3(new Shade.Vec3(new Shade.Vec3(env.ucolorC))), 1).xyz().mul((1 + Math.cos(env.time[0] * 2)) / 2))",
    "dependencies": ["time", null, "ucolorC", "ucolorTransform1", "ucolorB", "ucolorA"]
}, "u19": {
    "code": "new Shade.Mat4(new Shade.Mat4(new Shade.Mat4(new Shade.Mat4(new Shade.Mat4(new Shade.Mat4(env.ucolorTransform1)))))).mulVec(new Shade.Vec3(new Shade.Vec3(new Shade.Vec3(new Shade.Vec3(new Shade.Vec3(new Shade.Vec3(env.ucolorA)))))), 1).xyz().mul((1 + Math.cos(env.time[0] / 2)) / 2).add(new Shade.Mat4(new Shade.Mat4(new Shade.Mat4(new Shade.Mat4(new Shade.Mat4(env.ucolorTransform1))))).mulVec(new Shade.Vec3(new Shade.Vec3(new Shade.Vec3(new Shade.Vec3(new Shade.Vec3(env.ucolorB))))), 1).xyz().mul((1 + Math.sin(env.time[0])) / 2)).add(new Shade.Mat4(new Shade.Mat4(new Shade.Mat4(new Shade.Mat4(env.ucolorTransform1)))).mulVec(new Shade.Vec3(new Shade.Vec3(new Shade.Vec3(new Shade.Vec3(env.ucolorC)))), 1).xyz().mul((1 + Math.cos(env.time[0] * 2)) / 2)).add(new Shade.Mat4(new Shade.Mat4(new Shade.Mat4(env.ucolorTransform1))).mulVec(new Shade.Vec3(new Shade.Vec3(new Shade.Vec3(env.ucolorD))), 1).xyz().mul((1 + Math.cos(env.time[0] / 2)) / 2))",
    "dependencies": ["time", null, "ucolorD", "ucolorTransform1", "ucolorC", "ucolorB", "ucolorA"]
}, "u20": {
    "code": "new Shade.Mat4(new Shade.Mat4(new Shade.Mat4(new Shade.Mat4(new Shade.Mat4(new Shade.Mat4(new Shade.Mat4(env.ucolorTransform1))))))).mulVec(new Shade.Vec3(new Shade.Vec3(new Shade.Vec3(new Shade.Vec3(new Shade.Vec3(new Shade.Vec3(new Shade.Vec3(env.ucolorA))))))), 1).xyz().mul((1 + Math.cos(env.time[0] / 2)) / 2).add(new Shade.Mat4(new Shade.Mat4(new Shade.Mat4(new Shade.Mat4(new Shade.Mat4(new Shade.Mat4(env.ucolorTransform1)))))).mulVec(new Shade.Vec3(new Shade.Vec3(new Shade.Vec3(new Shade.Vec3(new Shade.Vec3(new Shade.Vec3(env.ucolorB)))))), 1).xyz().mul((1 + Math.sin(env.time[0])) / 2)).add(new Shade.Mat4(new Shade.Mat4(new Shade.Mat4(new Shade.Mat4(new Shade.Mat4(env.ucolorTransform1))))).mulVec(new Shade.Vec3(new Shade.Vec3(new Shade.Vec3(new Shade.Vec3(new Shade.Vec3(env.ucolorC))))), 1).xyz().mul((1 + Math.cos(env.time[0] * 2)) / 2)).add(new Shade.Mat4(new Shade.Mat4(new Shade.Mat4(new Shade.Mat4(env.ucolorTransform1)))).mulVec(new Shade.Vec3(new Shade.Vec3(new Shade.Vec3(new Shade.Vec3(env.ucolorD)))), 1).xyz().mul((1 + Math.cos(env.time[0] / 2)) / 2)).div((1 + Math.cos(env.time[0] / 2)) / 2 + (1 + Math.sin(env.time[0])) / 2 + (1 + Math.cos(env.time[0] * 2)) / 2 + (1 + Math.cos(env.time[0] * 20)) / 2)",
    "dependencies": ["time", null, "ucolorD", "ucolorTransform1", "ucolorC", "ucolorB", "ucolorA"]
}, "u21": {
    "code": "new Shade.Mat4(new Shade.Mat4(new Shade.Mat4(env.ucolorTransform2))).mulVec(new Shade.Vec3(new Shade.Vec3(new Shade.Vec3(env.ucolorA))), 1).xyz().mul((1 + Math.cos(env.time[0] / 2)) / 2)",
    "dependencies": ["time", null, "ucolorA", "ucolorTransform2"]
}, "u22": {
    "code": "new Shade.Mat4(new Shade.Mat4(new Shade.Mat4(new Shade.Mat4(env.ucolorTransform2)))).mulVec(new Shade.Vec3(new Shade.Vec3(new Shade.Vec3(new Shade.Vec3(env.ucolorA)))), 1).xyz().mul((1 + Math.cos(env.time[0] / 2)) / 2).add(new Shade.Mat4(new Shade.Mat4(new Shade.Mat4(env.ucolorTransform2))).mulVec(new Shade.Vec3(new Shade.Vec3(new Shade.Vec3(env.ucolorB))), 1).xyz().mul((1 + Math.sin(env.time[0])) / 2))",
    "dependencies": ["time", null, "ucolorB", "ucolorTransform2", "ucolorA"]
}, "u23": {
    "code": "new Shade.Mat4(new Shade.Mat4(new Shade.Mat4(new Shade.Mat4(new Shade.Mat4(env.ucolorTransform2))))).mulVec(new Shade.Vec3(new Shade.Vec3(new Shade.Vec3(new Shade.Vec3(new Shade.Vec3(env.ucolorA))))), 1).xyz().mul((1 + Math.cos(env.time[0] / 2)) / 2).add(new Shade.Mat4(new Shade.Mat4(new Shade.Mat4(new Shade.Mat4(env.ucolorTransform2)))).mulVec(new Shade.Vec3(new Shade.Vec3(new Shade.Vec3(new Shade.Vec3(env.ucolorB)))), 1).xyz().mul((1 + Math.sin(env.time[0])) / 2)).add(new Shade.Mat4(new Shade.Mat4(new Shade.Mat4(env.ucolorTransform2))).mulVec(new Shade.Vec3(new Shade.Vec3(new Shade.Vec3(env.ucolorC))), 1).xyz().mul((1 + Math.cos(env.time[0] * 2)) / 2))",
    "dependencies": ["time", null, "ucolorC", "ucolorTransform2", "ucolorB", "ucolorA"]
}, "u24": {
    "code": "new Shade.Mat4(new Shade.Mat4(new Shade.Mat4(new Shade.Mat4(new Shade.Mat4(new Shade.Mat4(env.ucolorTransform2)))))).mulVec(new Shade.Vec3(new Shade.Vec3(new Shade.Vec3(new Shade.Vec3(new Shade.Vec3(new Shade.Vec3(env.ucolorA)))))), 1).xyz().mul((1 + Math.cos(env.time[0] / 2)) / 2).add(new Shade.Mat4(new Shade.Mat4(new Shade.Mat4(new Shade.Mat4(new Shade.Mat4(env.ucolorTransform2))))).mulVec(new Shade.Vec3(new Shade.Vec3(new Shade.Vec3(new Shade.Vec3(new Shade.Vec3(env.ucolorB))))), 1).xyz().mul((1 + Math.sin(env.time[0])) / 2)).add(new Shade.Mat4(new Shade.Mat4(new Shade.Mat4(new Shade.Mat4(env.ucolorTransform2)))).mulVec(new Shade.Vec3(new Shade.Vec3(new Shade.Vec3(new Shade.Vec3(env.ucolorC)))), 1).xyz().mul((1 + Math.cos(env.time[0] * 2)) / 2)).add(new Shade.Mat4(new Shade.Mat4(new Shade.Mat4(env.ucolorTransform2))).mulVec(new Shade.Vec3(new Shade.Vec3(new Shade.Vec3(env.ucolorD))), 1).xyz().mul((1 + Math.cos(env.time[0] / 2)) / 2))",
    "dependencies": ["time", null, "ucolorD", "ucolorTransform2", "ucolorC", "ucolorB", "ucolorA"]
}, "u25": {
    "code": "new Shade.Mat4(new Shade.Mat4(new Shade.Mat4(new Shade.Mat4(new Shade.Mat4(new Shade.Mat4(new Shade.Mat4(env.ucolorTransform2))))))).mulVec(new Shade.Vec3(new Shade.Vec3(new Shade.Vec3(new Shade.Vec3(new Shade.Vec3(new Shade.Vec3(new Shade.Vec3(env.ucolorA))))))), 1).xyz().mul((1 + Math.cos(env.time[0] / 2)) / 2).add(new Shade.Mat4(new Shade.Mat4(new Shade.Mat4(new Shade.Mat4(new Shade.Mat4(new Shade.Mat4(env.ucolorTransform2)))))).mulVec(new Shade.Vec3(new Shade.Vec3(new Shade.Vec3(new Shade.Vec3(new Shade.Vec3(new Shade.Vec3(env.ucolorB)))))), 1).xyz().mul((1 + Math.sin(env.time[0])) / 2)).add(new Shade.Mat4(new Shade.Mat4(new Shade.Mat4(new Shade.Mat4(new Shade.Mat4(env.ucolorTransform2))))).mulVec(new Shade.Vec3(new Shade.Vec3(new Shade.Vec3(new Shade.Vec3(new Shade.Vec3(env.ucolorC))))), 1).xyz().mul((1 + Math.cos(env.time[0] * 2)) / 2)).add(new Shade.Mat4(new Shade.Mat4(new Shade.Mat4(new Shade.Mat4(env.ucolorTransform2)))).mulVec(new Shade.Vec3(new Shade.Vec3(new Shade.Vec3(new Shade.Vec3(env.ucolorD)))), 1).xyz().mul((1 + Math.cos(env.time[0] / 2)) / 2)).div((1 + Math.cos(env.time[0] / 2)) / 2 + (1 + Math.sin(env.time[0])) / 2 + (1 + Math.cos(env.time[0] * 2)) / 2 + (1 + Math.cos(env.time[0] * 20)) / 2)",
    "dependencies": ["time", null, "ucolorD", "ucolorTransform2", "ucolorC", "ucolorB", "ucolorA"]
}, "u26": {
    "code": "(1 + Math.cos(env.time[0] / 30)) / 2",
    "dependencies": ["time"]
}, "u27": {
    "code": "this.VecMath.mix(new Shade.Mat4(new Shade.Mat4(new Shade.Mat4(new Shade.Mat4(new Shade.Mat4(new Shade.Mat4(new Shade.Mat4(new Shade.Mat4(env.ucolorTransform1)))))))).mulVec(new Shade.Vec3(new Shade.Vec3(new Shade.Vec3(new Shade.Vec3(new Shade.Vec3(new Shade.Vec3(new Shade.Vec3(new Shade.Vec3(env.ucolorA)))))))), 1).xyz().mul((1 + Math.cos(env.time[0] / 2)) / 2).add(new Shade.Mat4(new Shade.Mat4(new Shade.Mat4(new Shade.Mat4(new Shade.Mat4(new Shade.Mat4(new Shade.Mat4(env.ucolorTransform1))))))).mulVec(new Shade.Vec3(new Shade.Vec3(new Shade.Vec3(new Shade.Vec3(new Shade.Vec3(new Shade.Vec3(new Shade.Vec3(env.ucolorB))))))), 1).xyz().mul((1 + Math.sin(env.time[0])) / 2)).add(new Shade.Mat4(new Shade.Mat4(new Shade.Mat4(new Shade.Mat4(new Shade.Mat4(new Shade.Mat4(env.ucolorTransform1)))))).mulVec(new Shade.Vec3(new Shade.Vec3(new Shade.Vec3(new Shade.Vec3(new Shade.Vec3(new Shade.Vec3(env.ucolorC)))))), 1).xyz().mul((1 + Math.cos(env.time[0] * 2)) / 2)).add(new Shade.Mat4(new Shade.Mat4(new Shade.Mat4(new Shade.Mat4(new Shade.Mat4(env.ucolorTransform1))))).mulVec(new Shade.Vec3(new Shade.Vec3(new Shade.Vec3(new Shade.Vec3(new Shade.Vec3(env.ucolorD))))), 1).xyz().mul((1 + Math.cos(env.time[0] / 2)) / 2)).div((1 + Math.cos(env.time[0] / 2)) / 2 + (1 + Math.sin(env.time[0])) / 2 + (1 + Math.cos(env.time[0] * 2)) / 2 + (1 + Math.cos(env.time[0] * 20)) / 2), new Shade.Mat4(new Shade.Mat4(new Shade.Mat4(new Shade.Mat4(new Shade.Mat4(new Shade.Mat4(new Shade.Mat4(new Shade.Mat4(env.ucolorTransform2)))))))).mulVec(new Shade.Vec3(new Shade.Vec3(new Shade.Vec3(new Shade.Vec3(new Shade.Vec3(new Shade.Vec3(new Shade.Vec3(new Shade.Vec3(env.ucolorA)))))))), 1).xyz().mul((1 + Math.cos(env.time[0] / 2)) / 2).add(new Shade.Mat4(new Shade.Mat4(new Shade.Mat4(new Shade.Mat4(new Shade.Mat4(new Shade.Mat4(new Shade.Mat4(env.ucolorTransform2))))))).mulVec(new Shade.Vec3(new Shade.Vec3(new Shade.Vec3(new Shade.Vec3(new Shade.Vec3(new Shade.Vec3(new Shade.Vec3(env.ucolorB))))))), 1).xyz().mul((1 + Math.sin(env.time[0])) / 2)).add(new Shade.Mat4(new Shade.Mat4(new Shade.Mat4(new Shade.Mat4(new Shade.Mat4(new Shade.Mat4(env.ucolorTransform2)))))).mulVec(new Shade.Vec3(new Shade.Vec3(new Shade.Vec3(new Shade.Vec3(new Shade.Vec3(new Shade.Vec3(env.ucolorC)))))), 1).xyz().mul((1 + Math.cos(env.time[0] * 2)) / 2)).add(new Shade.Mat4(new Shade.Mat4(new Shade.Mat4(new Shade.Mat4(new Shade.Mat4(env.ucolorTransform2))))).mulVec(new Shade.Vec3(new Shade.Vec3(new Shade.Vec3(new Shade.Vec3(new Shade.Vec3(env.ucolorD))))), 1).xyz().mul((1 + Math.cos(env.time[0] / 2)) / 2)).div((1 + Math.cos(env.time[0] / 2)) / 2 + (1 + Math.sin(env.time[0])) / 2 + (1 + Math.cos(env.time[0] * 2)) / 2 + (1 + Math.cos(env.time[0] * 20)) / 2), (1 + Math.cos(env.time[0] / 30)) / 2)",
    "dependencies": ["time", null, "ucolorD", "ucolorTransform1", "ucolorC", "ucolorB", "ucolorA", "ucolorTransform2"]
}}


 */
function shade(env) {

             var colorA, colorB, colorC, colorD, colorA2, colorB2, colorC2, colorD2;
              colorA = env.ucolorTransform1.mulVec(env.ucolorA,1).xyz();
              colorB = env.ucolorTransform1.mulVec(env.ucolorB,1).xyz();
              colorC = env.ucolorTransform1.mulVec(env.ucolorC,1).xyz();
              colorD = env.ucolorTransform1.mulVec(env.ucolorD,1).xyz();

              colorA2 = env.ucolorTransform2.mulVec(env.ucolorA,1).xyz();
              colorB2 = env.ucolorTransform2.mulVec(env.ucolorB,1).xyz();
              colorC2 = env.ucolorTransform2.mulVec(env.ucolorC,1).xyz();
              colorD2 = env.ucolorTransform2.mulVec(env.ucolorD,1).xyz();

              var t1 = (1 + Math.cos(env.time / 2)) / 2;
              var t2 = (1 + Math.sin(env.time)) / 2;
              var t3 = (1 + Math.cos(env.time* 2)) / 2;
              var t4 = (1 + Math.cos(env.time / 10)) / 2;
              t4 = Math.pow(t4, 5);
              t4 *= (1 + Math.cos(env.time*20)) / 2;
              var fullWeight = t1 + t2 + t3 + t4;
              var subColor1 = colorA.mul(t1);
              subColor1 = subColor1.add(colorB.mul(t2));
              subColor1 = subColor1.add(colorC.mul(t3));
              subColor1 = subColor1.add(colorD.mul(t1));
              subColor1 = subColor1.div(fullWeight);

              var subColor2 = colorA2.mul(t1);
              subColor2 = subColor2.add(colorB2.mul(t2));
              subColor2 = subColor2.add(colorC2.mul(t3));
              subColor2 = subColor2.add(colorD2.mul(t1));
              subColor2 = subColor2.div(fullWeight);

              var finalT = (1 + Math.cos(env.time / 30)) / 2;
              var finalColor = Math.mix(subColor1, subColor2, finalT);

              var colorWeight = Math.cos(env.texcoord.y() * 20) +  Math.sin(env.texcoord.x() * 20)
              return finalColor.mul(colorWeight * colorWeight * colorWeight);
}


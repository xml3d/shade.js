function shade(env) {
    var time = env.time / (env.interval * 2);
    var fTime = Math.fract(new Vec2(time, time + 0.5));
    var flowUv1 = env.uv.sub(env.flowDir.div(2)).add(env.flowDir.mul(fTime.x()));
    var flowUv2 = env.uv.sub(env.flowDir.div(2)).add(env.flowDir.mul(fTime.y()));

    var tx1 = env.waterTex.sample2D(flowUv1); 
    var tx2 = env.waterTex.sample2D(flowUv2);
    return Math.mix(tx1, tx2, Math.abs(2 * Math.fract(time) - 1));
}

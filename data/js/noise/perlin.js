// Translated from https://github.com/ashima/webgl-noise

function mod289(x)
{
  return x.sub(Math.floor(x.mul(1 / 289)).mul(289));
}

function permute(x)
{
  return mod289(x.mul(34).add(1).mul(x));
}

function taylorInvSqrt(r)
{
  return new Vec4(1.79284291400159).add(r.mul(- 0.85373472095314));
}

function fade(t) {
  return t.mul(t.mul(t.mul(t.mul(t.mul(6).sub(15)).add(10))));
}

// Classic Perlin noise
function cnoise2D(P)
{
  var Pi = Math.floor(P.xyxy()).add(new Vec4(0.0, 0.0, 1.0, 1.0));
  var Pf = Math.fract(P.xyxy()).sub(new Vec4(0.0, 0.0, 1.0, 1.0));
  Pi = mod289(Pi); // To avoid truncation effects in permutation
  var ix = Pi.xzxz();
  var iy = Pi.yyww();
  var fx = Pf.xzxz();
  var fy = Pf.yyww();

  var i = permute(permute(ix).add(iy));

  var gx = Math.fract(i.mul(1 / 41)).mul(2).sub(1);
  var gy = Math.abs(gx).sub(0.5);
  var tx = Math.floor(gx.add(0.5));
  gx = gx.sub(tx);

  var g00 = new Vec2(gx.x(),gy.x());
  var g10 = new Vec2(gx.y(),gy.y());
  var g01 = new Vec2(gx.z(),gy.z());
  var g11 = new Vec2(gx.w(),gy.w());

  var norm = taylorInvSqrt(new Vec4(g00.dot(g00), g01.dot(g01), g10.dot(g10), g11.dot(g11)));
  g00 = g00.mul(norm.x());
  g01 = g01.mul(norm.y());
  g10 = g10.mul(norm.z());
  g11 = g11.mul(norm.w());

  var n00 = g00.dot(fx.x(), fy.x());
  var n10 = g10.dot(fx.y(), fy.y());
  var n01 = g01.dot(fx.z(), fy.z());
  var n11 = g11.dot(fx.w(), fy.w());

  var fade_xy = fade(Pf.xy());
  var n_x = Math.mix(new Vec2(n00, n01), new Vec2(n10, n11), fade_xy.x());
  var n_xy = Math.mix(n_x.x(), n_x.y(), fade_xy.y());
  return 2.3 * n_xy;
}

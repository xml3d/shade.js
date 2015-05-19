// Translated from https://github.com/ashima/webgl-noise

function mod289(x)
{
  return x.sub(Math.floor(x.mul(1 / 289)).mul(289));
}

function permute(x) {
  return mod289((x.mul(34).add(1)).mul(x));
}

function snoise(v)
  {
  var C = new Vec4((3.0-Math.sqrt(3.0))/6.0,
                     0.5*(Math.sqrt(3.0)-1.0),
                      -1.0 + 2.0 * (3.0-Math.sqrt(3.0))/6.0,
                      1.0 / 41.0);
// First corner
  var i  = Math.floor(v.add(v.dot(C.yy())));
  var x0 = v.sub(i).add(i.dot(C.xx()));

// Other corners
  var i1;
  //i1.x = step( x0.y, x0.x ); // x0.x > x0.y ? 1.0 : 0.0
  //i1.y = 1.0 - i1.x;
  i1 = (x0.x > x0.y) ? new Vec2(1.0, 0.0) : new Vec2(0.0, 1.0);
  // x0 = x0 - 0.0 + 0.0 * C.xx ;
  // x1 = x0 - i1 + 1.0 * C.xx ;
  // x2 = x0 - 1.0 + 2.0 * C.xx ;
  var x12 = x0.xyxy().add(C.xxzz());
  x12.xy -= i1;

// Permutations
  i = mod289(i); // Avoid truncation effects in permutation
  var p = permute( permute( new Vec3(0.0, i1.y(), 1.0 ).add(i.y()))
                .add(i.x()).add(new Vec3(0.0, i1.x(), 1.0 )));

  var tmp = new Vec3(0.5).sub(x0.dot(x0), x12.xy().dot(x12.xy()), x12.zw().dot(x12.zw()));
  var m = Math.max(tmp, 0.0);
  m = m.mul(m);
  m = m.mul(m);

// Gradients: 41 points uniformly over a line, mapped onto a diamond.
// The ring size 17*17 = 289 is close to a multiple of 41 (41*7 = 287)

  var x = Math.fract(p.mul(C.www())).mul(2).sub(1);
  var h = Math.abs(x).sub(0.5);
  var ox = Math.floor(x.add(0.5));
  var a0 = x.sub(ox);

// Normalise gradients implicitly by scaling m
// Approximation of: m *= inversesqrt( a0*a0 + h*h );
  m = m.mul(a0.mul(a0).add(h.mul(h)).mul(- 0.85373472095314).add(1.79284291400159));

// Compute final noise value at P
  var g = new Vec3(a0.x()  * x0.x()  + h.x()  * x0.y(),
                    a0.yz().mul(x12.xz()).add(h.yz().mul(x12.yw()))
  );
  return 130 * m.dot(g);
}

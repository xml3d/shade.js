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

  var perm1 = mod289(ix.mul(34).add(1).mul(ix)).add(iy);
  var i = mod289(perm1.mul(34).add(1).mul(perm1));
  //var i = permute(permute(ix).add(iy));

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
  return (2.3 * n_xy);
}

function noise_turbulence(p, details)
{
	var fscale = 1.0;
	var amp = 1.0;
	var sum = 0.0;
	var i, n = details;
	
	for (i = 0; i <= 16; i++) {
      if (i <= details) {
		var t = 0.5 * cnoise2D(p.mul(fscale)) +0.5;
		sum += t * amp;
		amp *= 0.5;
		fscale *= 2.0;
      }
	}
	return sum * Math.pow(2,n) / (Math.pow(2,n+1)-1);
}

function mod289(x)
{
  return x.sub(Math.floor(x.mul(1 / 289)).mul(289));
}

function permute(x) {
  return mod289((x.mul(34).add(1)).mul(x));
}



function leather_pattern(p, scale, gamma, distortion) {
    if(this.fwidth) {
      var fw = this.fwidth(p.mul(scale).mul(4));
      var size = Math.max(fw.x(), fw.y());
      var one = 1.0 + 0.0001*size;
      if(size > 0.6) {
        return one - 0.5;
      }
    }
  	var band1 = Math.pow(wave(p, scale, 5, distortion, 2), 30);
	var band2 = Math.pow(wave(p.yx().mul(1,-1), scale, 5, distortion, 2), 30);
	var color = Math.max(band1, band2);
    return 1- color;
        
}

function wave(p, scale, detail, distortion, dscale)
{
    scale = scale == undefined ? 10 : scale;
    dscale = dscale == undefined ? 1 : dscale;
    p = p.mul(scale);
	
    var n = (p.x() + p.y() + (p.z ? p.z() : 0.0)) * 10.0;
	
	if (distortion !== undefined) {
		n += distortion * noise_turbulence(p.mul(dscale), 5);
	}
	return 0.5 + 0.5 * Math.sin(n);
}

function wrinkles(p, pattern, scale, threshold) {
  var value = noise_turbulence(p.mul(scale), 1);
  return (pattern < threshold) ? 0.0 : value;
}
function ramp(f) {
  var c1 = new Vec3(0.181, 0.076, 0.042);
  var c2 = new Vec3(0.119, 0.054, 0.033);
  var c3 = new Vec3(0.087, 0.043, 0.029);
  var c4 = new Vec3(0.056, 0.032, 0.025);
  if(f < 0.5)
    return Math.mix(c1, c2, f / 0.5);
  if(f < 0.8)
    return Math.mix(c2, c3, (f - 0.5) / 0.3);
  return Math.mix(c3, c4, (f - 0.8) / 0.2);
}

function bumpNormal(pos, n, height) {
  if(this.dx) {
    var dHeight = new Vec3(this.dx(height), this.dy(height), 0);
    var fw = Math.max(Math.abs(dHeight.x()), Math.abs(dHeight.y()));
    if(fw > 0.3)
      return n;
    var dPdx = this.dx(pos);
    var dPdy = this.dy(pos);  
 
    var dPdz = n.normalize();
    dPdy = dPdz.cross(dPdx).normalize();
    dPdx = dPdy.cross(dPdz).normalize();
 
    var N = dPdx.mul(-dHeight.x()).add(dPdy.mul(-dHeight.y())).add(dPdz).normalize();
    return N;
  } else {
  	return n.mul(height).normalize();
  }
}

function leather(pos, uv, n, roughness) {
  var pattern = leather_pattern(uv, 12, 4.5, 3);
  var bump = Math.clamp(1.0, 0.0, Math.pow(pattern, 0.1) * 0.2)	;
  var N = bumpNormal(pos, n, (pattern ) * 0.1);
  var color = Math.pow(pattern, 0.7);
  var w = wrinkles(uv, color, 7.5, 0.3);
  return new Shade().diffuse(ramp(w), N, 0.4).phong(new Vec3(1), N, roughness);
}

function shade(env) {
  return leather(env.position, env.texcoord, env.normal, env.shininess);
}

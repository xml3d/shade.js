function hash(n )
{
    return Math.fract(Math.sin(n)*43758.5453);
}
function noise( x )
{
    var p = Math.floor(x);
    var f = Math.fract(x);

    f = f.mul(f).mul(f.mul(-2).add(3));
    var n = p.x() + p.y()*57.0 + 113.0*p.z();
    return Math.mix(Math.mix(Math.mix( hash(n+  0.0), hash(n+  1.0),f.x()),
                   Math.mix( hash(n+ 57.0), hash(n+ 58.0),f.x()),f.y()),
               Math.mix(Math.mix( hash(n+113.0), hash(n+114.0),f.x()),
                   Math.mix( hash(n+170.0), hash(n+171.0),f.x()),f.y()),f.z()); 
}


function map( p )
{
	var d = 0.2 - p.y();

	var q = p.sub(new Vec3(1.0,0.1,0.0).mul(_env.time || 0.0)); 
	var f;
    f  = 0.5000*noise( q ); q = q.mul(2.02);
    f += 0.2500*noise( q ); q = q.mul(2.03);
    f += 0.1250*noise( q ); q = q.mul(2.01);
    f += 0.0625*noise( q );

	d += 3.0 * f;

	d = Math.clamp( d, 0.0, 1.0 );
	
	var res = new Vec4( d );

	res.xyz = Math.mix( new Vec3(1.0,0.95,0.8).mul(1.15), new Vec3(0.7,0.7,0.7), res.x() );
	
	return res;
}





function raymarch( ro, rd, sundir)
{
	var sum = new Vec4(0, 0, 0, 0);

	var t = 0.0;
	for(var i=0; i<64; i++)
	{
		if( sum.a > 0.99 ) continue;

		var pos = ro.add(rd.mul(t));
		var col = map( pos ); 
		
		var dif =  Math.clamp(  (col.w() - map(pos.add(sundir.mul(0.3))).w())/0.6, 0.0, 1.0 );

        var lin = new Vec3(0.65,0.68,0.7).mul(1.35).add(new Vec3(0.7, 0.5, 0.3).mul(0.45*dif));
		col = col.xyz(col.xyz().mul(lin));
		col = col.a(col.a() * 0.35);
		col = col.rgb(col.rgb().mul(col.a()));

		sum = sum.add( col.mul(1.0 - sum.a()));

		t += Math.max(0.1,0.025*t); 
	}

	sum = sum.xyz(sum.xyz().div(0.001+sum.w()));

	return Math.clamp( sum, 0.0, 1.0 );
}

/**
 *
 * @param env Parameters from the current environment
 * @param env.texcoords {Vec2} Texture coordinates (optional - uses screen coords others)
 * @param env.mouse {Vec2} Mouse value, used to change the viewing angle (optional)
 * @param env.time {number} Time to animate clouds (optional)
 * @return {*}
 */
function shade(env)
{
  	var sundir = new Vec3(-1.0,0.0,0.0);
  
	var resolution = new Vec2(this.width, this.height);
  	var q = env.texcoord ? new Vec2(env.texcoord.x(), 1 - env.texcoord.y()) : this.normalizedCoords.xy();
    var p = q.mul(2).sub(1);
    p = p.x(p.x() * resolution.x()/ resolution.y());
  	var mo = (env.mouse ? env.mouse.xy() : new Vec2(0)).mul(2).div(resolution).sub(1);
    
    // camera
    var ro = new Vec3(Math.cos(2.75-3.0*mo.x()), 0.7+(mo.y()+1.0), Math.sin(2.75-3.0*mo.x())).normalize().mul(4);
	var ta = new Vec3(0.0, 1.0, 0.0);
    var ww = ta.sub(ro).normalize();
    var uu = new Vec3(0.0,1.0,0.0).cross(ww).normalize();
    var vv = ww.cross(uu).normalize();
    var rd = uu.mul(p.x()).add(vv.mul(p.y())).add(ww.mul(1.5)); 

    var res = raymarch( ro, rd, sundir); 
	var sun = Math.clamp( sundir.dot(rd), 0.0, 1.0 );
	var col = new Vec3(0.6,0.71,0.75).sub(new Vec3(1.0,0.5,1.0).mul(rd.y()*0.2).add(0.15*0.5));
	col = col.add( new Vec3(1.0,.6,0.1).mul(0.2*Math.pow( sun, 8.0 )));
	col = col.mul(0.95);
	col = Math.mix( col, res.xyz(), res.w() );
	col = col.add(new Vec3(1.0,0.4,0.2).mul( 0.1 * Math.pow( sun, 3.0 ) )); 
    return col; 
}

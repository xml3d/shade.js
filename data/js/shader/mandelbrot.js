// Created by inigo quilez - iq/2013
// License Creative Commons Attribution-NonCommercial-ShareAlike 3.0 Unported License.


// This shader computes the distance to the Mandelbrot Set for everypixel, and colorizes
// it accoringly.
// 
// Z -> Z²+c, Z0 = 0. 
// therefore Z' -> 2·Z·Z' + 1
//
// The Hubbard-Douady potential G(c) is G(c) = log Z/2^n
// G'(c) = Z'/Z/2^n
//
// So the distance is |G(c)|/|G'(c)| is |Z|·log|Z|/|Z'|
//
// More info here: http://www.iquilezles.org/www/articles/distancefractals/distancefractals.htm
// https://www.shadertoy.com/view/lsX3W4
function shade(env)
{
    var p = this.normalizedCoords.mul(2).sub(1);
    p = p.x(this.width / this.height);

    // animation	
    var tz = 0.5 - 0.5*Math.cos(0.225*env.time);
    var zoo = Math.pow( 0.5, 13.0*tz );
    var cc = new Vec2(-0.05,.6805).add(p.mul(zoo));

    // iterate
    var z  = new Vec2();
    var m2 = 0.0;
    var co = 0.0;
    var dz = new Vec2(0);
    for( var i=0; i<256; i++ )
    {
        if( m2>1024.0 ) continue;

        // Z' -> 2·Z·Z' + 1
        dz = new Vec2(z.x()*dz.x()-z.y()*dz.y(), z.x()*dz.y() + z.y()*dz.x() );
        dz = dz.mul(2).add(1,0);

        // Z -> Z² + c			
        z = new Vec2( z.x()*z.x() - z.y()*z.y(), 2.0*z.x()*z.y() ).add(cc);

        m2 = z.dot(z);
        co += 1.0;
    }

    // distance	
    // d(c) = |Z|·log|Z|/|Z'|
    var d = 0.0;
    if( co<256.0 ) d = Math.sqrt( z.dot(z)/dz.dot(dz) )*Math.log(z.dot(z));


    // do some soft coloring based on distance
    d = Shade.clamp( 4.0*d/zoo, 0.0, 1.0 );
    d = Math.pow( d, 0.25 );
    return new Vec3( d );
}

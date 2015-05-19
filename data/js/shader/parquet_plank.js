var MINFILTERWIDTH = 1.0e-7;

function shade(env) {

    var PGWIDTH = env.plankwidth + env.groovewidth,
        planklength = PGWIDTH * env.plankspertile - env.groovewidth,
        PGHEIGHT = planklength + env.groovewidth,
        GWF = env.groovewidth * 0.5 / PGWIDTH,
        GHF = env.groovewidth * 0.5 / PGHEIGHT,
        txtscale = env.txtscale !== undefined ? env.txtscale : 1.0,
        darkwood = env.darkwood || new Color(0.1),
        lightwood = env.lightwood || new Color(0.9),
        specularcolor = env.specularcolor || new Color(1),
        groovecolor = env.groovecolor || new Color(0.5);

    /* Determine how wide in s-t space one pixel projects to */
    var fac;
    if (this.fwidth) {
        fac = Math.max(this.fwidth(env.texcoord), new Vec2(MINFILTERWIDTH)).div(PGWIDTH, PGHEIGHT).mul(2* txtscale);
    } else {
        fac = new Vec2(0.001).div(PGWIDTH, PGHEIGHT).mul(txtscale);
    }
    var fwidth = Math.max(fac.x(), fac.y());

    var ss = (txtscale * env.texcoord.x()) / PGWIDTH;
    var whichrow = Math.floor(ss);
    var tt = (txtscale * env.texcoord.y()) / PGHEIGHT;
    var whichplank = Math.floor(tt);
    if ((whichrow / env.plankspertile + whichplank) % 2 >= 1) {
        ss = txtscale * env.texcoord.y() / PGWIDTH;
        whichrow = Math.floor(ss);
        tt = txtscale * env.texcoord.x() / PGHEIGHT;
        whichplank = Math.floor(tt);
        fac = fac.ts();
    }
    ss -= whichrow;
    tt -= whichplank;
    whichplank += 20 * (whichrow + 10);

    var w, h;
    if(this.fwidth) {
        if (fac.s() >= 1) {
            w = 1 - 2 * GWF;
        }
        else w = Math.clamp(boxstep(GWF - fac.s(), GWF, ss), Math.max(1 - GWF / fac.s(), 0), 1)
            - Math.clamp(boxstep(1 - GWF - fac.s(), 1 - GWF, ss), 0, 2 * GWF / fac.s());

        if (fac.t() >= 1) {
            h = 1 - 2 * GHF;
        }
        else h = Math.clamp(boxstep(GHF - fac.t(), GHF, tt), Math.max(1 - GHF / fac.t(), 0), 1)
            - Math.clamp(boxstep(1 - GHF - fac.t(), 1 - GHF, tt), 0, 2 * GHF / fac.t());
    } else {
        // Non-aliased version
        w = Math.step(GWF, ss) - Math.step(1 - GWF, ss);
        h = Math.step(GHF, tt) - Math.step(1 - GHF, tt);
    }
    var groovy = w * h;

    /*
     * Add the ring patterns
     */
    var r = 0.0;

    var fade = Math.smoothstep(1 / env.ringscale, 8 / env.ringscale, fwidth);
    if (fade < 0.999) {
        var ttt = tt / 4 + whichplank / 28.38 + env.wavy * noiselayer(new Vec2(8 * ss, tt / 4));
        r = env.ringscale * noiselayer(new Vec2(ss - whichplank, ttt));
        r -= Math.floor(r);
        r = 0.3 + 0.7 * Math.smoothstep(0.2, 0.55, r) * (1 - Math.smoothstep(0.75, 0.8, r));
        r = (1 - fade) * r + 0.65 * fade;

        fade = Math.smoothstep(2 / env.grainscale, 8 / env.grainscale, fwidth);

        if (fade < 0.999) {
            var r2 = 1.3 - noiselayer(new Vec2(ss * env.grainscale, (tt * env.grainscale / 4)));
            r2 = env.grainy * r2 * r2 + (1 - env.grainy);
            r *= (1 - fade) * r2 + (0.75 * fade);
        }
        else {
            r *= 0.75;
        }
    }
    else {
        r = 0.4875;
    }

    /* Mix the light and dark wood according to the grain pattern */
    var woodcolor = Math.mix(lightwood, darkwood, r);

    /* Add plank-to-plank variation in overall color */
    woodcolor = woodcolor.mul(1 - env.plankvary / 2 + env.plankvary * hash(whichplank + 0.5));

    var ct = Math.mix(groovecolor, woodcolor, groovy);
    //var normal = Math.mix(env.normal.add(0, 1, 0).normalize(), env.normal.normalize(), groovy);

    ct = linear_to_gamma(ct);

    /* Use the plastic illumination model */
    return new Shade().diffuse(ct, env.normal).phong(ct.mul(specularcolor), env.normal, env.shininess !== undefined ? env.shininess : 0);
}

function hash(n) {
    return Math.fract(Math.sin(n)*43758.5453123);
}

var vGammaPower = new Vec3(2.2);

function linear_to_gamma(c)
{
    return Math.pow(c, vGammaPower);
}

function noiselayer(uv) {
    var f = Math.fract(uv);
    uv = Math.floor(uv);
    var v = uv.x() + uv.y() *1e3;
    var r = new Vec4(v, v+1, v+1e3, v+1e3+1);
    r = Math.fract(Math.sin(r.mul(1e-2)).mul(100000.0));
    f = f.mul(f).mul(new Vec2(3.0).sub(f.mul(2.0)));
    return (Math.mix(Math.mix(r.x(), r.y(), f.x()), Math.mix(r.z(), r.w(), f.x()), f.y()));
}

function boxstep(a,b,x) {
    return Math.clamp((x-a)/(b-a),0,1);
}

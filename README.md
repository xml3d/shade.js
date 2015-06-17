# shade.js [![Build Status](https://img.shields.io/travis/xml3d/shade.js/develop.svg)](https://travis-ci.org/xml3d/shade.js)  [![Build Status](https://img.shields.io/npm/l/shade.js.svg)](http://opensource.org/licenses/MIT)

Shade.js is a material description language and a compiler framework.
It compiles procedural material descriptions based on s subset of JavaScript to GLSL and OSL.
The aim of shade.js is to simplify creating new materials and being able to share materials between different rendering
frameworks.
Here, we have a strong focus on WebGL frameworks.
That's why we have chosen JavaScript as the base language and why the whole compiler framework is written in JavaScript
as well.

shade.js is integrated into [xml3d.js](https://github.com/xml3d/xml3d.js).
For the some scientific background and technical details refer to [our paper](http://xml3d.org/xml3d/papers/shade.js/).
The whole project is still in an early alpha phase, so please have some patient until everything works as expected.


Try it online: http://xml3d.org/xml3d/shade-studio/

## Install

Install all dependencies with [npm](http://npmjs.org)

```
npm install
```

from the root directory

## Build

Using the node environment, just include index.js from the src directory:

```javascript
require("src/index.js")
```

To built a version to run in the browser, run the build script from the build directory:

```
grunt build
```

## Usage

The entry of a material description is the ```shade``` function:

```javascript
    function shade(env) {
      this;  // the system environment object
      env;   // the execution environment object
      Shade; // global object that provides closures
      Math;  // extended JavaScript Math object
      
      return new Vec3(1, 0.5, 0); // either return a RGB color
      return new Vec4(1, 0.5, 0, 1); // or return a RGBA color
      
      // or return a color closure
      return Shade.diffuse(...);
    }
```    

### The Shade object

The ```Shade``` object provides a set of color closures and the ```mix``` method to blend multiple color closures.


#### Shade.cookTorrance()
Returns a closure that represents specular reflectance of the surface based on the Cool-Torrance microfacet model.

```javascript
Shade.cookTorrance(color, normal, ior, roughness) {
  color;     // specular RGB color
  normal;    // Unit length surface normal
  ior;       // Index of refraction, used for the fresnel term of the Cook-Torrance model
  roughness; // [0-1], rms slope of the surface microfacets (the roughness of the material)
}
```

#### Shade.diffuse()
Returns a closure that represents the Lambertian diffuse reflectance of a smooth surface, or of a rough surface implementing the Oren-Nayar reflection model if ```sigma``` is defined.

```javascript
Shade.diffuse(color, normal, roughness) {
  color;      // diffuse RGB color
  normal;     // Unit length surface normal
  roughness;  // 0 or undefined => Lambertian,
              // roughness > 0  => roughness of the surface based on Oren-Nayar
}
```

#### Shade.emissive()
Returns a closure color that represents an emissive material.

```javascript
Shade.emissive(intensity) {
  intensity;    // emissive RGB intensity
}
```

#### Shade.mix()
Linearily interpolate between two closures: c1 ∗ (1−α) + c2 ∗ (α)

```javascript
Shade.mix(c1, c2, alpha) {
  c1;     // First color closure
  c2;     // Second color closure
  alpha;  // value to use to interpolate between c1 and c2
}
```

#### Shade.phong()
Returns a closure that represents specular reflectance of the surface using the Blinn-Phong BRDF.

```javascript
Shade.phong(color, normal, exponent) {
  color;     // specular RGB color
  normal;    // Unit length surface normal
  exponent;  // [0-1], a higher exponent indicates a smoother surface
}
```

#### Shade.reflect()
Returns a closure color that represents the ideal reflection (mirror) from the surface.

```javascript
Shade.reflect(normal, factor) {
  normal;   // Unit length surface normal
  factor;   // RGB scale factor of reflection
}
```

#### Shade.refract()
Returns a closure color that represents the ideal refraction (glass-like) of objects behind the surface.

```javascript
Shade.reflect(normal, eta, factor) {
  normal;   // Unit length surface normal
  eta;      // The ratio of indices of refraction
  factor;   // RGB scale factor of reflection
}
```

#### Shade.transparent()
Returns a closure color that represents a (semi-)transparent material.
In general, this is implemented using alpha-blending (with all its known issues).

```javascript
Shade.transparent(factor) {
  factor;    // transparent RGB factor
}
```


#### Shade.ward()
Returns a closure that represents the anisotropic specular reflectance of the surface based on the Ward BRDF.

```javascript
Shade.ward(color, normal, tangent, ax, ay) {
  color;    // specular RGB color
  normal;   // Unit length surface normal
  tangent;  // Vector to determinate a direction for the anisotropic effects
  ax;       // [0-1], Amount of roughness along the tangent
  ay;       // [0-1], Amount of roughness along the binormal (normal x tangent)
}
```

### Vectors

shade.js has built-in  2, 3 and 4 component vectors. All vectors are immutable.

#### Construction

```javascript
    var a = new Vec2();  // Construct new vector with 2 components
    assert(a.x () == a.y() == 0);
    
    var b = new Vec2(1, 2);  // Construct vector and initialize components
    assert(a.x() == 1);
    assert(a.y() == 2);

    var c = new Vec3(1);  // Construct vector and initialize with single value
    assert(a.x() == a.y() == a.z() == 1);

```    

#### Swizzles
Accessing the components of the vectors is very similar to GLSL:

```javascript
    var a = new Vec4(1, 2, 3, 4);  // Components can be accessed using sets x/y/z/w or r/g/b/a, s/t/p/q
    assert(a.x() == a.r() == a.s() == 1);
    assert(a.y() == a.g() == a.t() == 2);
    assert(a.z() == a.b() == a.p() == 3);
    assert(a.w() == a.a() == a.q() == 4);
    
    // Access subsets of the vector
    a.x(); // == 1
    a.xy(); // == Vec2(1, 2);
    a.xyz(); // == Vec3(1, 2, 3);
    a.xyzw(); // == Vec4(1, 2, 3, 4);

    // Mix access
    a.xxx(); // == Vec3(1, 1, 1);
    a.xyxy(); // == Vec4(1, 2, 1, 2);
    a.xyxy(); // == Vec4(1, 2, 1, 2);
    a.bgr(); // == Vec4(3, 2, 1);
    a.xr(); // fails: Do not mix access sets
    
    // Chain access
    a.abgr().abgr();  // Vec4(1, 2, 3, 4);

```    



## Tests

We use the [mocha](http://visionmedia.github.io/mocha/) test framework for testing.

### Installation
```
npm install -g mocha
```

### Run Tests

Run

```
mocha
```

from the root directory

or

```
grunt test
```

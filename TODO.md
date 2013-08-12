## TODO

### Shading Language
* Define use-cases, types, built-in functions etc
* Defined Color Closures
    * diffuse
    * phong

[__OSL Surface Closures__](https://github.com/imageworks/OpenShadingLanguage/blob/master/src/doc/osl-languagespec.pdf?raw=true):

* Scatter: diffuse, phong, orennayar, ward, microfacet_beckmann, reflection, refraction,
microfacet_beckmann_refraction, microfacet_ggx_refraction, transparent, translucent
* Emissive: emission, background

[__NVIDIA MDL__](http://www.nvidia-arc.com/fileadmin/user_upload/iray_2013/documents/mdl_introduction.121115.pdf):

* Scatter: diffuse_reflection_bsdf, diffuse_transmission_bsdf, specular_bsdf, simple_glossy_bsdf, backscattering_glossy reflection_bsdf
* Emissive: diffuse_edf, spot_edf, measured_edf


### Analysis

* Find Parameters: Extend to global (KS) ✔
* Type Inference: Handle functions / function calls
* Uniform expression detection
* [Slicing](http://en.wikipedia.org/wiki/Program_slicing) to extract indiviual buffers

### Generator

* Switch to own (simple) implementation (FK)
* Generate code for Forward Rendering (xml3d.js)
* Generate code for Deferred Rendering (xml3d.js)
* Generate code for external RT/GI renderer

## Studio

* Implement version independent from xml3d.js that allows users to define type of parameters (FK) ✔
* Implement version that allows to write basic fragment shaders
* Implement integrated version

## xml3d.js

* Integration of shade.js
* Implement Deferred Renderer
* Implement Shadows
* Implement Closure for extracted uniform expressions

## Embree

* Load geometry
* Compile and load shader code


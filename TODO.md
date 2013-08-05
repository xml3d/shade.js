## TODO

### Shading Language
* Define use-cases, types, built-in functions etc
* Defined Color Closures
    * diffuse
    * phong


### Analysis

* Find Parameters: Extend to global (KS)
* Type Inference: Handle functions / function calls
* Uniform expression detection
* [Slicing](http://en.wikipedia.org/wiki/Program_slicing) to extract indiviual buffers

### Generator

* Switch to own (simple) implementation (FK)
* Generate code for Forward Rendering (xml3d.js)
* Generate code for Deferred Rendering (xml3d.js)
* Generate code for external RT/GI renderer

## Studio

* Implement version independent from xml3d.js that allows users to define type of parameters (FK)
* Implement integrated version

## xml3d.js

* Integration of shade.js
* Implement Deferred Renderer
* Implement Shadows
* Implement Closure for extracted uniform expressions

## External renderer

* Load geometry
* Compile and load shader code


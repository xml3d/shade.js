# shade.js

Repository for common activities regarding a compiler framework for Xflow and XML3D.

The aim is to provide programmable custom shading and xflow kernels that can be cross-compiled to several back-ends, including River Trail kernel and GLSL shaders. The front-end language is JavaScript.


## Install

Run

  npm install

from the root directory

## Build

Using the node environment, just include index.js from the root directory:

  require("index.js")

To built a version to run in the browser, run the build script from the build directory:

  node build/build.js


## Running tests

First

 npm install -g mocha

then run

 mocha

from the root directory

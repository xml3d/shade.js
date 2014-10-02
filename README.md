# shade.js

[![Build Status](https://travis-ci.org/xml3d/shade.js.svg?branch=develop)](https://travis-ci.org/xml3d/shade.js)

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

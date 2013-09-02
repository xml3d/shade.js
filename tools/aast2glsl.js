#!/usr/bin/env node

var argv = require('optimist').argv,
    usage = "node ./aast2glsl.js aast.json";

(function (args) {

    var fs = require("fs"),
        GLSLCompiler = require("../src/generate/glsl/compiler").GLSLCompiler;
    var filename = args._[0];


    if (!filename) {
        console.log(usage);
        process.exit(0);
    }


    var code = (function () {
        var data = fs.readFileSync(filename, "utf-8");
        var obj = JSON.parse(data);
        return new GLSLCompiler().compileFragmentShader(obj);
    }());

    console.log(code);


}(argv));

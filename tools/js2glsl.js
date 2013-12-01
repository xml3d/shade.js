#!/usr/bin/env node

var argv = require('optimist').argv,
    Shade = require('..'),
    usage = "node ./js2glsl.js script.js [-p]";

(function (args) {

    var fs = require("fs"),
        path = require("path"),
        GLSLCompiler = require("../src/generate/glsl/compiler").GLSLCompiler,
        filename = args._[0];


    if (!filename) {
        console.log(usage);
        process.exit(0);
    }

    var ctx = filename.replace(/\.[^/.]+$/, "") + "-context.json";

    var code = (function () {

        var contextData = {};
        if (fs.existsSync(ctx)) {
            console.log("Found context file: " + ctx);
            contextData = JSON.parse(fs.readFileSync(ctx, "utf-8"));
        }
        var data = fs.readFileSync(filename, "utf-8");
        var opt = { inject: contextData, loc: true, implementation: "xml3d-glsl-forward", entry: "global.shade", propagateConstants: true, validate: true};
        var aast = Shade.parseAndInferenceExpression(data, opt);
        //return require("../src/generate/glsl/generate.js").generate(aast);
        return new GLSLCompiler().compileFragmentShader(aast, {useStatic: true});
    }());

    if (args.p) {
        console.log(code.source);
    } else {
        console.log(code.source);

    }

}(argv));

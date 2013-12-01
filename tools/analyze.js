#!/usr/bin/env node

var argv = require('optimist').argv,
    Shade = require('..'),
    usage = "node ./js2glsl.js script.js [-p]";

(function (args) {

    var fs = require("fs"),
        path = require("path"),
        GLSLCompiler = require("../src/generate/glsl/compiler").GLSLCompiler,
        codegen = require('escodegen'),
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
        var opt = { inject: contextData,
                    loc: true,
                    implementation: "xml3d-glsl-forward",
                    entry: "global.shade",
                    propagateConstants: true,
                    sanitize: args.sanitize == undefined ? true :  args.sanitize,
                    validate: args.validate == undefined ? true :  args.validate
        };
        return Shade.analyze(data, opt);

    }());

    console.log(codegen.generate(code.ast));

    if(code.error)
        console.error(code.error.msg);



}(argv));

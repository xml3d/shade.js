#!/usr/bin/env node

var argv = require('optimist').argv,
    Shade = require('..'),
    usage = "node ./js2embree.js script.js [-p]";

(function (args) {

    var fs = require("fs"),
        path = require("path"),
        EmbreeCompiler = require("../src/generate/embree/compiler").EmbreeCompiler,
        filename = args._[0];


    if (!filename) {
        console.log(usage);
        process.exit(0);
    }

    var ctx = filename.replace(/\.[^/.]+$/, "") + "-context.json";

    var code = (function () {

        var contextData = {};
        if (fs.existsSync(ctx)) {
            console.error("Found context file: " + ctx);
            var contextData = JSON.parse(fs.readFileSync(ctx, "utf-8"));
        }
        var data = fs.readFileSync(filename, "utf-8");
        var aast = Shade.parseAndInferenceExpression(data, { inject: contextData, loc: true });
        return new EmbreeCompiler().compileShader(aast);
    }());

    if (args.p) {
        console.log(code);
    } else {
        console.log(code);

    }

}(argv));

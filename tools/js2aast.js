#!/usr/bin/env node

var argv = require('optimist').argv,
    Shade = require('..'),
    usage = "node ./js2ast.js script.js [-p]";

(function (args) {

    var fs = require("fs"),
        path = require("path"),
        filename = args._[0];


    if (!filename) {
        console.log(usage);
        process.exit(0);
    }

    var ctx = filename.replace(/\.[^/.]+$/, "") + "-context.json";


    var ast = (function () {

        var contextData = {};
        if (fs.existsSync(ctx)) {
            console.log("Found context file: " + ctx);
            var contextData = JSON.parse(fs.readFileSync(ctx, "utf-8"));
        }
        var data = fs.readFileSync(filename, "utf-8");
        return Shade.parseAndInferenceExpression(data, contextData);
    }());

    if (args.p) {
        console.log(JSON.stringify(ast, null, 2));
    } else {
        console.log(JSON.stringify(ast));

    }

}(argv));

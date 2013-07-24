#!/usr/bin/env node

var argv = require('optimist').argv,
    Shade = require('..'),
    usage = "node ./js2ast.js script.js [-p]";

(function (args) {

    var fs = require("fs"),
        filename = args._[0];


    if (!filename) {
        console.log(usage);
        process.exit(0);
    }

    var ast = (function () {
        var data = fs.readFileSync(filename, "utf-8");
        return Shade.parseAndInferenceExpression(data);
    }());

    if (args.p) {
        console.log(JSON.stringify(ast, null, 1));
    } else {
        console.log(JSON.stringify(ast));

    }

}(argv));

#!/usr/bin/env node

var argv = require('optimist').argv,
    parser = require('esprima'),
    usage = "node ./js2ast.js script.js [-p]";

(function (args) {

    var fs = require("fs"),
        parser = require("esprima");
    var filename = args._[0];


    if (!filename) {
        console.log(usage);
        process.exit(0);
    }


    var ast = (function () {
        var data = fs.readFileSync(filename, "utf-8");
        return parser.parse(data, { raw: true });
    }());

    if (args.p) {
        console.log(JSON.stringify(ast, null, 1));
    } else {
        console.log(JSON.stringify(ast));

    }

}(argv));

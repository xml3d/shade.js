#!/usr/bin/env node

var argv = require('optimist').argv,
    Shade = require('..'),
    usage = "node ./extractParameters.js script.js [-p]";

(function (args) {

    var fs = require("fs"),
        path = require("path"),
        filename = args._[0];


    if (!filename) {
        console.log(usage);
        process.exit(0);
    }


    var parameters = (function () {

        var data = fs.readFileSync(filename, "utf-8");
        return Shade.extractParameters(data);
    }());

    if (args.p) {
        console.log(JSON.stringify(parameters, null, 2));
    } else {
        console.log(JSON.stringify(parameters));

    }

}(argv));

#!/usr/bin/env node

var argv = require('optimist').argv,
    usage = "node ./ast2js.js ast.json";

(function (args) {

    var fs = require("fs"),
        codegen = require("escodegen");
    var filename = args._[0];


    if (!filename) {
        console.log(usage);
        process.exit(0);
    }


    var code = (function () {
        var data = fs.readFileSync(filename, "utf-8");
        var obj = JSON.parse(data);
        return codegen.generate(obj);
    }());

    console.log(code);


}(argv));
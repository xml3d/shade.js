#!/usr/bin/env node

var argv = require('optimist').argv,
    usage = "node ./slice.js script.js [-p]";

var esprima = require('esprima');
var esgraph = require('esgraph');
var estraverse = require('estraverse');
var escodegen = require('escodegen');
var analyses = require('analyses');
var map = require('es6-map-shim');
var common = require("../src/base/common.js");

var fs = require('fs');

var semantics = require("../src/analyze/semantics/semantics.js")
var Set = analyses.Set;
var Syntax = common.Syntax;

function doAnalysis(cfg) {
    var count = 1;
    cfg[2].forEach(function(n) {!n.type && (n.label = count++)});
    var output = semantics(cfg, new Set( [ {name: "diffuseColor", type: "color"},  {name: "normal", type: "normal"}] ));
    return output.get(cfg[0]);
}


(function (args) {

    var filename = args._[0];


    if (!filename) {
        console.log(usage);
        process.exit(0);
    }

    var data = fs.readFileSync(filename, "utf-8");
    var ast = esprima.parse(data);



    var shadeFunction = ast.body.filter(function(node) { return node.type == Syntax.FunctionDeclaration && node.id.name == "shade"});

    if(!shadeFunction.length) {
        console.log("No shade function found");
        process.exit(0);
    }

    ast = shadeFunction[0];

    var start = Date.now();
    var cfg = esgraph(ast.body, { omitExceptions: true });

    var startNode = cfg[1].prev[0]; // Start at the node before the implicit end node for now
    var semantics = doAnalysis(cfg, startNode); // ~17ms

    var result = {};
    semantics.forEach(function(elem) { result[elem.name] = elem.type; });
    console.log(result);


    var duration = Date.now() - start;

    console.log(duration + " ms");



}(argv));

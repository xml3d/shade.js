#!/usr/bin/env node

var argv = require('optimist').argv,
    usage = "node ./slice.js script.js [-p]";

var esprima = require('esprima');
var esgraph = require('esgraph');
var estraverse = require('estraverse');
var escodegen = require('escodegen');
var analyses = require('analyses');
var map = require('es6-map-shim');
var Shade = require("..");
var fs = require('fs');
var slice = require("../src/analyze/slice.js")


var slice = require("../src/analyze/slice.js");
var Set = analyses.Set;

function doAnalysis(cfg, variable) {
    var count = 1;
    cfg[2].forEach(function(n) {!n.type && (n.label = count++)});
    var output = slice(cfg, cfg[1].prev[0], variable);
    output.add(cfg[1].prev[0]);
    return output;
}


(function (args) {

    var filename = args._[0];


    if (!filename) {
        console.log(usage);
        process.exit(0);
    }

    var data = fs.readFileSync("./data/js/fragments/slice-example.js", "utf-8");

    var start = Date.now();

    var ast = esprima.parse(data);
    var cfg = esgraph(ast, { omitExceptions: true });

    var relevantStatements = doAnalysis(cfg, "product"); // ~17ms

    var getCFGNode = function(cfg, ast) {
        for(var i = 0; i< cfg[2].length; i++) {
            if (!cfg[2][i].type && cfg[2][i].astNode == ast) {
                return cfg[2][i];
            }
        }
        return null;
    }

    ast = estraverse.replace(ast, {
        enter: function(node) {
            var cfgNode = null;

            if (node.type == estraverse.Syntax.ExpressionStatement) {
                cfgNode = getCFGNode(cfg, node.expression);
            } else {
                cfgNode = getCFGNode(cfg, node);
            }

            if (cfgNode) { // AST has a corresponding CFG node
                if (!relevantStatements.has(cfgNode)) {
                    return { type: estraverse.Syntax.EmptyStatement };
                }
            }

        }});

    console.log(escodegen.generate(ast));

    var duration = Date.now() - start;

    console.log(duration + " ms");



}(argv));

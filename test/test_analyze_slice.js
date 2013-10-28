var esprima = require('esprima');
var esgraph = require('esgraph');
var analyses = require('analyses');
var map = require('es6-map-shim');
var Shade = require("..");
var fs = require('fs');
var should = require('should');

var parseAndInferenceExpression = function (str, ctx) {
    var aast = Shade.parseAndInferenceExpression(str, ctx || {});
    return aast;
}


var slice = require("../src/analyze/slice.js");
var Set = analyses.Set;

/**
 * returns the analysis output for the entry node, since this is a
 * backwards analysis
 */
function doAnalysis(code, variable) {
    var ast = esprima.parse(code);
    var cfg = esgraph(ast, { omitExceptions: true });
    var count = 1;
    cfg[2].forEach(function(n) {!n.type && (n.label = count++)});
    var output = slice(cfg, cfg[1].prev[0], variable);
    return output;
}

describe('Slicing', function () {
    it('should work for example from program slicing survey paper', function () {
        var data = fs.readFileSync("./data/js/fragments/slice-example.js", "utf-8");
        var relevantNodes = doAnalysis(data, "product");
        [1, 2, 4, 5, 7, 8].forEach(function(nodeId) {
            should(relevantNodes.values().some(function(node) { return node.label == nodeId; })).equal(true, nodeId);
        })
    });

});

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
var common = require("../src/base/common.js");
var Set = analyses.Set;
var Syntax = common.Syntax;

/**
 * returns the analysis output for the entry node, since this is a
 * backwards analysis
 */
function doAnalysis(code, variable, useFunc) {
    if(typeof code == 'string')
        code = esprima.parse(code);
    var cfg = esgraph(code, { omitExceptions: true });
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
        });

        var expected = new Set([6,7,8]);
        var branch = relevantNodes.values().filter(function(node) { return node.label == 5;})[0];
        var actual = branch.infl.values().reduce(function(p, v) {p.add(v.label); return p; }, new Set());
        should(Set.equals(expected, actual)).true;

    });

    it('should work for xml3d-diffuse shader', function () {
        var data = fs.readFileSync("./data/js/shader/xml3d-diffuse.js", "utf-8");
        data = esprima.parse(data);
        var shadeFunction = data.body.filter(function(node) { return node.type == Syntax.FunctionDeclaration && node.id.name == "shade"});

        var relevantNodes = doAnalysis(shadeFunction[0].body, "emissiveColor");

        [3, 10, 11].forEach(function(nodeId) {
            should(relevantNodes.values().some(function(node) { return node.label == nodeId; })).equal(true, nodeId);
        });

        var expected = new Set([11]);
        var branch = relevantNodes.values().filter(function(node) { return node.label == 10;})[0];
        var actual = branch.infl.values().reduce(function(p, v) {p.add(v.label); return p; }, new Set());
        should(Set.equals(expected, actual)).true;

    });

});

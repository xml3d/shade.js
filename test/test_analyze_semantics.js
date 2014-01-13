var esprima = require('esprima');
var esgraph = require('esgraph');
var analyses = require('analyses');
var map = require('es6-map-shim');
var Shade = require("..");
var fs = require('fs');
var should = require('should');
var semantics = require("../src/analyze/semantics/semantics.js");

var Set = analyses.Set;

function doAnalysis(cfg) {
    var count = 1;
    cfg[2].forEach(function(n) {!n.type && (n.label = count++)});
    var output = semantics(cfg, null);
    var startNodeResult = output.get(cfg[0]);
    var result = {};
    startNodeResult.forEach(function(elem) { result[elem.name] = elem.type; });
    return result;
}

function createTest(dir, file) {
    var contents = fs.readFileSync(dir + file, 'utf8');
    var ast = esprima.parse(contents, {comment: true, range: true});
    var comments = ast.comments;
    delete ast.comments;
    it(comments[0].value.trim() + ' (' + file + ')', function () {
        if (ast.body[0].type === 'FunctionDeclaration')
            ast = ast.body[0].body;
        var cfg = esgraph(ast);
        var expected = JSON.parse(comments[1].value);
        //console.log(expected);
        var actual = doAnalysis(cfg);
        actual.should.eql(expected);
    });
}

describe('Semantic analysis:', function () {
    var dir = __dirname + '/data/semantics/';
    var files = fs.readdirSync(dir);
    files.forEach(function (file) {
        createTest(dir, file);
    });
});

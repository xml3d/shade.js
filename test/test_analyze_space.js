var esprima = require('esprima');
var esgraph = require('esgraph');
var analyses = require('analyses');
var map = require('es6-map-shim');
var Shade = require("..");
var fs = require('fs');
var should = require('should');
var spaceAnalyzer = require("../src/analyze/space_analyzer.js"),
    SpaceVectorType = spaceAnalyzer.SpaceVectorType;

var Set = analyses.Set;

function createTest(dir, file) {
    if(fs.lstatSync(dir + file).isDirectory())
        return;
    var contents = fs.readFileSync(dir + file, 'utf8');
    var ast = esprima.parse(contents, {comment: true, range: true});
    var comments = ast.comments;
    delete ast.comments;
    var description = comments[0].value.trim() + ' (' + file + ')';
    var attributes = JSON.parse(comments[1].value);
    var expected = JSON.parse(comments[2].value);
    for(var name in expected){
        expected[name] = expected[name].map(function(elem){ return SpaceVectorType[elem]});
    }
    var ctx = {
        "global.shade": attributes
    }
    it(description, function () {
        var aast = Shade.parseAndInferenceExpression(contents, { inject: ctx });
        if (aast.body[0].type === 'FunctionDeclaration')
            aast = aast.body[0];
        else
            throw new Error("Test Code must be a function");
        var actual = spaceAnalyzer.analyze(aast);
        actual.should.eql(expected)
    });
}

describe('Space analysis:', function () {
    var dir = __dirname + '/data/space/';
    //createTest(dir, "dualspace.js");

    var files = fs.readdirSync(dir);
    files.forEach(function (file) {
        createTest(dir, file);
    });
});

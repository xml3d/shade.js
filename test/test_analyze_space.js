var esprima = require('esprima');
var esgraph = require('esgraph');
var analyses = require('analyses');
var map = require('es6-map-shim');
var Shade = require("..");
var fs = require('fs');
var should = require('should');
var space = require("../src/analyze/space.js"),
    SpaceTypes = space.SpaceTypes;

var Set = analyses.Set;

function doAnalysis(cfg) {
    var output = space(cfg, null);
    var startNodeResult = output.get(cfg[0]);
    var result = {};
    startNodeResult.forEach(function(elem) {
        if(!result[elem.name]) result[elem.name] = [];
        result[elem.name].push(elem.space);
    });
    return result;
}

function createTest(dir, file) {
    var contents = fs.readFileSync(dir + file, 'utf8');
    var ast = esprima.parse(contents, {comment: true, range: true});
    var comments = ast.comments;
    delete ast.comments;
    var description = comments[0].value.trim() + ' (' + file + ')';
    var attributes = JSON.parse(comments[1].value);
    var expected = JSON.parse(comments[2].value);
    for(var name in expected){
        expected[name] = expected[name].map(function(elem){ return SpaceTypes[elem]});
    }
    var ctx = {
        "global.shade": attributes
    }
    it.only(description, function () {
        var aast = Shade.parseAndInferenceExpression(contents, { inject: ctx });
        if (aast.body[0].type === 'FunctionDeclaration')
            aast = aast.body[0].body;
        var cfg = esgraph(aast);
        //console.log(expected);
        var actual = doAnalysis(cfg);
        actual.should.eql(expected);
    });
}

describe('Semantic analysis:', function () {
    var dir = __dirname + '/data/space/';
    createTest(dir, "nospace.js");
    /*
    var files = fs.readdirSync(dir);
    files.forEach(function (file) {
        createTest(dir, file);
    });
    */
});

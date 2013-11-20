var esprima = require('esprima');
var esgraph = require('esgraph');
var analyses = require('analyses');
var map = require('es6-map-shim');
var codegen = require("escodegen");
var Shade = require("..");
var walk = require('estraverse');
var Syntax = walk.Syntax;
var fs = require('fs');
var should = require('should');
var spaceAnalyzer = require("../src/analyze/space_analyzer.js"),
    SpaceTransformer = require("../src/generate/space/transform.js").SpaceTransformer,
    SpaceVectorType = spaceAnalyzer.SpaceVectorType;

var Set = analyses.Set;


function sortSpaceResult(input){
    var result = {};
    var resultNames = [];
    for(var name in input){
        resultNames.push(name);
        input[name].sort(function(a,b){ return a.name < b.name});
    }
    resultNames.sort();
    for(var i = 0; i < resultNames.length; ++i){
        result[resultNames[i]] = input[resultNames[i]];
    }
    return result;
}

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
        expected[name] = expected[name].map(function(elem){
            elem.space = SpaceVectorType[elem.space];
            return elem;
        });
    }
    expected = sortSpaceResult(expected);
    var ctx = {
        "global.shade": [{
            "extra": {
                "type": "object", "kind": "any", "global": true,
                "info": attributes
            }
        }]
    }
    it(description, function () {
        console.log(dir + file);
        var input = {
                type: Syntax.Program,
                body: ast.body[0].body
            },
            output = {
                type: Syntax.Program,
                body: ast.body[1].body
            };

        var aast = Shade.parseAndInferenceExpression(input, { inject: ctx });
        var transformResult = SpaceTransformer.transformAast(aast);
        transformResult = sortSpaceResult(transformResult);
        var outputCode = codegen.generate(output);
        var transformedCode = codegen.generate(aast);
        transformedCode.should.eql(outputCode);
        transformResult.should.eql(expected);
    });
}

describe('Space Transform:', function () {

    var dir = __dirname + '/data/spacetransform/';
    //createTest(dir, "multifunction.js");
    var files = fs.readdirSync(dir);
    files.forEach(function (file) {
        createTest(dir, file);
    });


});

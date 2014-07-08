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
var Compiler = require("../src/generate/glmatrix/compiler.js").GLMatrixCompiler;


function createTest(dir, file) {
    if(fs.lstatSync(dir + file).isDirectory())
        return;
    var contents = fs.readFileSync(dir + file, 'utf8');
    var ast = esprima.parse(contents, {comment: true, range: true});
    var comments = ast.comments;
    delete ast.comments;
    var description = comments[0].value.trim() + ' (' + file + ')';
    var attributes = JSON.parse(comments[1].value);
    var i = attributes.length;
    while(i--){
        attributes[i] = { extra: attributes[i]};
    }
    var ctx = {
        "global.main": attributes
    }
    it(description, function () {
        var input = {
                type: Syntax.Program,
                body: ast.body[0].body
            },
            output = {
                type: Syntax.Program,
                body: ast.body[1].body
            };
        output.body[0].id.name = "main";

        var aast = Shade.parseAndInferenceExpression(input, { entry: "global.main", throwOnError: true, inject: ctx, validate: true, sanitize: true });
        var compiler = new Compiler();
        var compiledCode = compiler.compile(aast);
        var expectedCode = codegen.generate(output);
        compiledCode.should.eql(expectedCode);
    });
}

describe.only('GLMatrix Compilation:', function () {

    var dir = __dirname + '/data/glmatrix/';

//    createTest(dir, "swizzles.js");

    var files = fs.readdirSync(dir);
    files.forEach(function (file) {
        createTest(dir, file);
    });

});

var esprima = require('esprima');
var Shade = require("..");
var fs = require('fs');
var should = require('should');
var GLSLCompiler = require("../src/generate/glsl/compiler").GLSLCompiler;



function createTest(dir, file) {
    var contents = fs.readFileSync(dir + file, 'utf8');
    var ast = esprima.parse(contents, {comment: true, range: true, raw: true});
    var comments = ast.comments;
    delete ast.comments;
    it(comments[0].value.trim() + ' (' + file + ')', function () {
        var aast = Shade.parseAndInferenceExpression(ast, {entry: "global.shade"});
        var result = new GLSLCompiler().compileFragmentShader(aast, {useStatic: true, omitHeader: true});
        var actual = result.source.trim();
        var expected = comments[1].value.trim();
        //console.log(actual);
        actual.should.eql(expected);
    });
}

describe('GLSL Shader Code:', function () {
    var dir = __dirname + '/data/shaders/glsl/';
    var files = fs.readdirSync(dir);
    files.forEach(function (file) {
        createTest(dir, file);
    });
});

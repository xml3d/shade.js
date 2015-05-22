var esprima = require('esprima');
var Shade = require("..");
var fs = require('fs');
var codegen = require("escodegen");
var should = require('should');
var walk = require('estraverse');
var Syntax = walk.Syntax;
var GLSLCompiler = require("../src/generate/glsl/compiler").GLSLCompiler,
    ColorClosureSignature = require("../src/resolve/xml3d-glsl-deferred/color-closure-signature.js").ColorClosureSignature,
    LightPassGenerator = require("../src/generate/light-pass/light-pass-generator.js");

function createTest(dir, file) {
    var filename = dir + file;
    var contents = fs.readFileSync(filename, 'utf8');
    var ast = esprima.parse(contents, {comment: true, range: true, raw: true});
    var comments = ast.comments;
    delete ast.comments;

    it(comments[0].value.trim() + ' (' + file + ')', function () {
        var input = {
                type: Syntax.Program,
                body: ast.body[0].body
            },
            expected = {
                type: Syntax.Program,
                body: ast.body[1].body
            };

        ColorClosureSignature.clearIdCache();
        var processData = {};
        Shade.resolveClosures(input, "xml3d-glsl-deferred", processData);
        var colorClosureSignatures = processData['colorClosureSignatures'];
        var lightPassAst = LightPassGenerator.generateLightPassAst(colorClosureSignatures);

        var expectedCode = codegen.generate(expected);
        var lightPassCode = codegen.generate(lightPassAst);
        lightPassCode.should.eql(expectedCode);
    });
}

xdescribe('Light Pass Shader Code:', function () {
    var dir = __dirname + '/data/shaders/lightpass/';
    //createTest(dir, "basic.js");

    var files = fs.readdirSync(dir);
    files.filter(function(filename) { return filename.split('.').pop() == "js" }).forEach(function (file) {
        createTest(dir, file);
    });
});

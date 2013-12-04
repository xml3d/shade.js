var esprima = require('esprima');
var Shade = require("..");
var fs = require('fs');
var should = require('should');
var codegen = require('escodegen');


function createTest(dir, file) {
    var filename = dir + file;
    var contents = fs.readFileSync(filename, 'utf8');
    var ast = esprima.parse(contents, {comment: true, range: true, raw: true});
    var comments = ast.comments;
    delete ast.comments;

    var ctx = filename.replace(/\.[^/.]+$/, "") + "-context.json";
    var contextData = {};
    if (fs.existsSync(ctx)) {
        contextData = JSON.parse(fs.readFileSync(ctx, "utf-8"));
    }


    it(comments[0].value.trim() + ' (' + file + ')', function () {
        var aast = Shade.parseAndInferenceExpression(ast, {inject: contextData, entry: "global.shade", propagateConstants: true, validate: true, sanitize: false});
        var result = codegen.generate(aast);
        var actual = result.trim();
        var expected = comments[1].value.trim();
        expected = expected.replace(/\r\n/g,"\n");
        //console.log(actual);
        actual.should.eql(expected);
    });
}

describe('Constant propagation:', function () {
    var dir = __dirname + '/data/constantpropagation/';
    var files = fs.readdirSync(dir);
    files.filter(function(filename) { return filename.split('.').pop() == "js" }).forEach(function (file) {
        createTest(dir, file);
    });
});

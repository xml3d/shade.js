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
        var opt = {
            inject: contextData,
            entry: "global.shade",
            propagateConstants: true,
            validate: true,
            sanitize: true,
            extractUniformExpressions: true
        }
        var aast = Shade.parseAndInferenceExpression(ast, opt);
        var result = codegen.generate(aast);
        var actual = result.trim();
        var expected = comments[1].value.trim();

        // Test code
        expected = expected.replace(/\r\n/g,"\n");
        actual.should.eql(expected);

        // Test uniform expressions
        var expressions = JSON.parse(comments[2].value.trim());
        actual = opt.uniformExpressions;
        actual.should.eql(expressions);



    });
}

describe('Uniform Expressions:', function () {
    var dir = __dirname + '/data/uniformExpressions/';
    var files = fs.readdirSync(dir);

    files = files.filter(function(filename) { return filename.split('.').pop() == "js" });
    files.forEach(function (file) {
        createTest(dir, file);
    });
});

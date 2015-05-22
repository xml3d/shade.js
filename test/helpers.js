var fs = require('fs');
var should = require('should');
var esprima = require('esprima');


var createTest = function (dir, file, test) {
    var filename = dir + file;
    var contents = fs.readFileSync(filename, 'utf8');
    var ast = esprima.parse(contents, {comment: true, range: true, raw: true});

    var comments = ast.comments;
    delete ast.comments;

    var expected = comments[1].value.trim();
    expected = expected.replace(/\r\n/g, "\n");


    var ctx = filename.replace(/\.[^/.]+$/, "") + "-context.json";
    var contextData = {};
    if (fs.existsSync(ctx)) {
        contextData = JSON.parse(fs.readFileSync(ctx, "utf-8"));
    }

    it(comments[0].value.trim() + ' (' + file + ')', test.bind(this, ast, contextData, expected));
};

var addTestDirectory = function (dir, test) {
    var files = fs.readdirSync(dir);
    files.filter(function (filename) {
        return filename.split('.').pop() == "js"
    }).forEach(function (file) {
        createTest(dir, file, test);
    });
};

module.exports = {
    createTest: createTest, addTestDirectory: addTestDirectory
};

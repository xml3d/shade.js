
var GLSLCompiler = require("../src/generate/glsl/compiler").GLSLCompiler,
    fs = require("fs"),
    Shade = require('..');

var loadAndGenerate = function(filename) {
    var ctx = filename.replace(/\.[^/.]+$/, "") + "-context.json";
    var code = (function () {
        var contextData = {};
        if (fs.existsSync(ctx)) {
            console.log("Found context file: " + ctx);
            var contextData = JSON.parse(fs.readFileSync(ctx, "utf-8"));
        }
        var data = fs.readFileSync(filename, "utf-8");
        var aast = Shade.parseAndInferenceExpression(data, { inject: contextData });
        return new GLSLCompiler().compileFragmentShader(aast);
    }());
    return code;
}

describe('Code generation', function () {
    it("should generate simple shader", function() {
        var code = loadAndGenerate("data/js/shader/red.js");
        //code.should.match(/vec3\(1\.0/);
        //console.log(code);
    });
    xit("handle return 'undefined' in main", function() {
        var code = loadAndGenerate("data/js/shader/discard.js");
        code.should.match(/discard/);
        console.log(code);
    });

});

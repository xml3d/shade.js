
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

var generateExpression = function(exp) {
    var aast = Shade.parseAndInferenceExpression(exp, { inject: {} });
    return new GLSLCompiler().compileFragmentShader(aast, {omitHeader: true});
}

describe('GLSL Code generation,', function () {
    describe('declaration of type', function() {
        it("int", function() {
            var code = generateExpression("var x = 5;");
            code.should.match(/int x = 5;/);
        });
        it("float", function() {
            var code = generateExpression("var x = 5.0;");
            code.should.match(/float x = 5.0;/);
        });
        xit("bool", function() {
            var code = generateExpression("var x = true;");
            code.should.match(/bool x = true;/);
        });
        it("Color with 4 parameters", function() {
            var code = generateExpression("var x = new Color(0.1, 0.1, 0.1, 0.9);");
            code.should.match(/vec4 x = vec4\(0.1, 0.1, 0.1, 0.9\);/);
        });
        xit("Color with 3 parameters", function() {
            var code = generateExpression("var x = new Color(0.1, 0.1, 0.1);");
            code.should.match(/vec4 x = vec4\(0.1, 0.1, 0.1, 1\);/);
        });
        xit("Color with 2 parameters", function() {
            var code = generateExpression("var x = new Color(0.1, 0.9);");
            code.should.match(/vec4 x = vec4\(0.1, 0.1, 0.1, 0.9\);/);
        });
        xit("Color with 1 parameter", function() {
            var code = generateExpression("var x = new Color(0.1);");
            code.should.match(/vec4 x = vec4\(0.1, 0.1, 0.1, 1.0\);/);
        });
        xit("Color without parameter", function() {
            var code = generateExpression("var x = new Color();");
            code.should.match(/vec4 x = vec4\(0, 0, 0, 1\);/);
        });
        xit("any", function() {
            var code = generateExpression.bind(null, "var x;");
            code.should.throw();
        });
    });
    describe('assignment of type', function() {
        xit("int", function() {
            var code = generateExpression("var x; x = 5;");
            code.should.match(/int x;\s*x = 5;/);
        });
        xit("float", function() {
            var code = generateExpression("var x; x = 5.0;");
            code.should.match(/float x;\s*x = 5;/);
        });
        xit("bool", function() {
            var code = generateExpression("var x; x = true;");
            code.should.match(/bool x;\s*x = true;/);
        });
        xit("Color with 4 parameters", function() {
            var code = generateExpression("var x; x = new Color(0.1, 0.1, 0.1, 0.9);");
            code.should.match(/vec4 x;\s*x = vec4\(0.1, 0.1, 0.1, 0.9\);/);
        });
    });

    describe('Math object', function() {
        it("cos", function() {
            var code = generateExpression("Math.cos(1.5);");
            code.should.equal("cos(1.5);");
        });
        it("PI", function() {
            var code = generateExpression("Math.PI;");
            code.should.equal("3.141592653589793;");
        });
    });

    describe('Vec2', function() {
        it("constructor", function() {
            var code = generateExpression("var a = new Vec2();");
            code.should.equal("vec2 a = vec2();");
        });
        it("x()", function() {
            var code = generateExpression("var a = new Vec2().x();");
            code.should.equal("float a = vec2().x;");
        });
        it("y()", function() {
            var code = generateExpression("var a = new Vec2(1).y();");
            code.should.equal("float a = vec2(1).y;");
        });
        it("xy()", function() {
            var code = generateExpression("var a = new Vec2(1, 2).xy();");
            code.should.equal("vec2 a = vec2(1, 2).xy;");
        });
        it("x(5)", function() {
            var code = generateExpression("var a = new Vec2().x(5);");
            code.should.equal("vec2 a = vec2(5, vec2().y);");
        });
    });

    describe('Special treatments', function() {
        it("modulo", function() {
            var code = generateExpression("5 % 3;");
            code.should.equal("mod(float(5), float(3));");
        });
        it("Math.floor changes type of call", function() {
            var code = generateExpression("Math.floor(2.0 % 20.0) > 0");
            code.should.equal("floor(mod(2.0, 20.0)) > float(0);");
        });

    });

    it("should generate simple shader", function() {
        var code = loadAndGenerate("data/js/shader/red.js");
        code.should.match(/vec4\(1/);
    });
    it("handle return 'undefined' in main", function() {
        var code = loadAndGenerate("data/js/shader/discard.js");
        code.should.match(/discard/);
    });

});

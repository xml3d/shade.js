
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
        it("negative int", function() {
            var code = generateExpression("var x = -5;");
            code.should.match(/int x = -5;/);
        });
        it("float", function() {
            var code = generateExpression("var x = 5.0;");
            code.should.match(/float x = 5.0;/);
        });
        it("bool", function() {
            var code = generateExpression("var x = true;");
            code.should.match(/bool x = true;/);
        });
        it("Color with 3 parameters", function() {
            var code = generateExpression("var x = new Color(0.1, 0.1, 0.1);");
            code.should.match(/vec3 x = vec3\(0.1, 0.1, 0.1\);/);
        });
        it("Color with 1 parameter", function() {
            var code = generateExpression("var x = new Color(0.1);");
            code.should.match(/vec3 x = vec3\(0.1\);/);
        });
        xit("Color without parameter", function() {
            var code = generateExpression("var x = new Color();");
            code.should.match(/vec3 x = vec3\(0, 0, 0\);/);
        });
        it("any", function() {
            var code = generateExpression.bind(null, "var x;");
            code.should.throw();
        });
    });
    describe('assignment of type', function() {
        it("int", function() {
            var code = generateExpression("var x; x = 5;");
            code.should.match(/int x;\s*x = 5;/);
        });
        it("float", function() {
            var code = generateExpression("var x; x = 5.0;");
            code.should.match(/float x;\s*x = 5.0;/);
        });
        it("bool", function() {
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
            code.should.equal("vec2 a = vec2(0.0);");
        });
        it("constructor from number", function() {
            var code = generateExpression("var a = new Vec2(1);");
            code.should.equal("vec2 a = vec2(1);");
        });
        it("constructor from 2 numbers", function() {
            var code = generateExpression("var a = new Vec2(1,2);");
            code.should.equal("vec2 a = vec2(1, 2);");
        });
        it("constructor from vec3", function() {
            var code = generateExpression("var a = new Vec2(new Vec3(1,2,3));");
            code.should.equal("vec2 a = vec2(vec3(1, 2, 3));");
        });
        it("constructor from vec4", function() {
            var code = generateExpression("var a = new Vec2(new Vec4(1,2,3,4));");
            code.should.equal("vec2 a = vec2(vec4(1, 2, 3, 4));");
        });
        it("x()", function() {
            var code = generateExpression("var a = new Vec2().x();");
            code.should.equal("float a = vec2(0.0).x;");
        });
        it("y()", function() {
            var code = generateExpression("var a = new Vec2(1).y();");
            code.should.equal("float a = vec2(1).y;");
        });
        it("xy()", function() {
            var code = generateExpression("var a = new Vec2(1, 2).xy();");
            code.should.equal("vec2 a = vec2(1, 2).xy;");
        });
        it("xxyy()", function() {
            var code = generateExpression("var a = new Vec2(2, 3).xxyy();");
            code.should.equal("vec4 a = vec2(2, 3).xxyy;");
        });
        it("x(5)", function() {
            var code = generateExpression("var a = new Vec2().x(5);");
            code.should.equal("vec2 a = vec2(5, vec2(0.0).y);");
        });
        it("yx(5,2)", function() {
            var code = generateExpression("var a = new Vec2().yx(5, 2);");
            code.should.equal("vec2 a = vec2(vec2(5, 2).y, vec2(5, 2).x);");
        });
        it("length()", function() {
            var code = generateExpression("var a = new Vec2(5).length();");
            code.should.equal("float a = length(vec2(5));");
        });
        it("length(5)", function() {
            var code = generateExpression("var a = new Vec2(1,-1).length(5);");
            code.should.equal("vec2 a = vec2(1, -1) * ( 5 / length(vec2(1, -1)) );");
        });
        it("normalize()", function() {
            var code = generateExpression("var a = new Vec2(1,-1).normalize();");
            code.should.equal("vec2 a = normalize(vec2(1, -1));");
        });
        it("dot()", function() {
            var code = generateExpression("var a = new Vec2(1,2).dot(-1,4)");
            code.should.equal("float a = dot(vec2(1, 2), vec2(-1, 4));");
        });
        it("add()", function() {
            var code = generateExpression("var a = new Vec2(1,2).add(5)");
            code.should.equal("vec2 a = vec2(1, 2) + vec2(5);");
        });
        it("sub()", function() {
            var code = generateExpression("var a = new Vec2(5).sub( new Vec3(5))");
            code.should.equal("vec2 a = vec2(5) - vec2(vec3(5));");
        });
        it("mul()", function() {
            var code = generateExpression("var a = new Vec2(5).mul(2,3)");
            code.should.equal("vec2 a = vec2(5) * vec2(2, 3);");
        });
        it("div()", function() {
            var code = generateExpression("var a = new Vec2(5).div(new Vec2(2))");
            code.should.equal("vec2 a = vec2(5) / vec2(2);");
        });
    });

    describe('Vec3', function() {
        it("constructor", function() {
            var code = generateExpression("var a = new Vec3();");
            code.should.equal("vec3 a = vec3(0.0);");
        });
        it("constructor from number", function() {
            var code = generateExpression("var a = new Vec3(1);");
            code.should.equal("vec3 a = vec3(1);");
        });
        it("constructor from 3 numbers", function() {
            var code = generateExpression("var a = new Vec3(1,2.0,3);");
            code.should.equal("vec3 a = vec3(1, 2.0, 3);");
        });
        it("constructor from vec2 and number", function() {
            var code = generateExpression("var a = new Vec3(new Vec2(1,2), 3);");
            code.should.equal("vec3 a = vec3(vec2(1, 2), 3);");
        });
        it("constructor from number and vec2", function() {
            var code = generateExpression("var a = new Vec3(1, new Vec2(2,3));");
            code.should.equal("vec3 a = vec3(1, vec2(2, 3));");
        });
        it("constructor from vec4", function() {
            var code = generateExpression("var a = new Vec3(new Vec4(1,2,3,4));");
            code.should.equal("vec3 a = vec3(vec4(1, 2, 3, 4));");
        });
        it("x()", function() {
            var code = generateExpression("var a = new Vec3().x();");
            code.should.equal("float a = vec3(0.0).x;");
        });
        it("y()", function() {
            var code = generateExpression("var a = new Vec3(1).y();");
            code.should.equal("float a = vec3(1).y;");
        });
        it("zy()", function() {
            var code = generateExpression("var a = new Vec3(1, 2, 3).zy();");
            code.should.equal("vec2 a = vec3(1, 2, 3).zy;");
        });
        it("xy()", function() {
            var code = generateExpression("var a = new Vec3(1, 2, 3).xy();");
            code.should.equal("vec2 a = vec3(1, 2, 3).xy;");
        });
        it("xxzz()", function() {
            var code = generateExpression("var a = new Vec3(1, 2, 3).xxzz();");
            code.should.equal("vec4 a = vec3(1, 2, 3).xxzz;");
        });
        it("x(5)", function() {
            var code = generateExpression("var a = new Vec3().x(5);");
            code.should.equal("vec3 a = vec3(5, vec3(0.0).y, vec3(0.0).z);");
        });
        it("yx(5,2)", function() {
            var code = generateExpression("var a = new Vec3(5).yx(5, 2);");
            code.should.equal("vec3 a = vec3(vec2(5, 2).y, vec2(5, 2).x, vec3(5).z);");
        });
        it("zyx(5,2)", function() {
            var code = generateExpression("var a = new Vec3(2).zyx(9);");
            code.should.equal("vec3 a = vec3(vec3(9).z, vec3(9).y, vec3(9).x);");
        });
        it("length()", function() {
            var code = generateExpression("var a = new Vec3(5).length();");
            code.should.equal("float a = length(vec3(5));");
        });
        it("length(5)", function() {
            var code = generateExpression("var a = new Vec3(1,-1, 2).length(5);");
            code.should.equal("vec3 a = vec3(1, -1, 2) * ( 5 / length(vec3(1, -1, 2)) );");
        });
        it("normalize()", function() {
            var code = generateExpression("var a = new Vec3(1,-1, 0).normalize();");
            code.should.equal("vec3 a = normalize(vec3(1, -1, 0));");
        });
        it("dot()", function() {
            var code = generateExpression("var a = new Vec3(1,2,3).dot(-1,4,5)");
            code.should.equal("float a = dot(vec3(1, 2, 3), vec3(-1, 4, 5));");
        });
        it("add()", function() {
            var code = generateExpression("var a = new Vec3(1,2,3).add(5)");
            code.should.equal("vec3 a = vec3(1, 2, 3) + vec3(5);");
        });
        it("sub()", function() {
            var code = generateExpression("var a = new Vec3(5).sub( new Vec4(5))");
            code.should.equal("vec3 a = vec3(5) - vec3(vec4(5));");
        });
        it("mul()", function() {
            var code = generateExpression("var a = new Vec3(5).mul(2,3,1)");
            code.should.equal("vec3 a = vec3(5) * vec3(2, 3, 1);");
        });
        it("div()", function() {
            var code = generateExpression("var a = new Vec3(5).div(new Vec3(2))");
            code.should.equal("vec3 a = vec3(5) / vec3(2);");
        });
    });


    describe('Vec4', function() {
        it("constructor", function() {
            var code = generateExpression("var a = new Vec4();");
            code.should.equal("vec4 a = vec4(0.0);");
        });
        it("constructor from number", function() {
            var code = generateExpression("var a = new Vec4(1);");
            code.should.equal("vec4 a = vec4(1);");
        });
        it("constructor from 4 numbers", function() {
            var code = generateExpression("var a = new Vec4(1, 2.0, 3, 1);");
            code.should.equal("vec4 a = vec4(1, 2.0, 3, 1);");
        });
        it("constructor from 2 vec2s", function() {
            var code = generateExpression("var a = new Vec4(new Vec2(1,2), new Vec2(3,4));");
            code.should.equal("vec4 a = vec4(vec2(1, 2), vec2(3, 4));");
        });
        it("constructor from number, vec2 and number", function() {
            var code = generateExpression("var a = new Vec4(1, new Vec2(2,3), 4);");
            code.should.equal("vec4 a = vec4(1, vec2(2, 3), 4);");
        });
        it("constructor from vec3 and number", function() {
            var code = generateExpression("var a = new Vec4( new Vec3(1,2,3), 4);");
            code.should.equal("vec4 a = vec4(vec3(1, 2, 3), 4);");
        });
        it("x()", function() {
            var code = generateExpression("var a = new Vec4().x();");
            code.should.equal("float a = vec4(0.0).x;");
        });
        it("y()", function() {
            var code = generateExpression("var a = new Vec4(1).y();");
            code.should.equal("float a = vec4(1).y;");
        });
        it("wy()", function() {
            var code = generateExpression("var a = new Vec4(1, 2, 3, 0).wy();");
            code.should.equal("vec2 a = vec4(1, 2, 3, 0).wy;");
        });
        it("xy()", function() {
            var code = generateExpression("var a = new Vec4(1, 2, 3, 0).xy();");
            code.should.equal("vec2 a = vec4(1, 2, 3, 0).xy;");
        });
        it("wwww()", function() {
            var code = generateExpression("var a = new Vec4(1, 2, 3, 4).wwxw();");
            code.should.equal("vec4 a = vec4(1, 2, 3, 4).wwxw;");
        });
        it("x(5)", function() {
            var code = generateExpression("var a = new Vec4().w(5);");
            code.should.equal("vec4 a = vec4(vec4(0.0).x, vec4(0.0).y, vec4(0.0).z, 5);");
        });
        it("wx(5,2)", function() {
            var code = generateExpression("var a = new Vec4(9).wx(5, 2);");
            code.should.equal("vec4 a = vec4(vec2(5, 2).y, vec4(9).y, vec4(9).z, vec2(5, 2).x);");
        });
        it("xywz(1,2,3,4)", function() {
            var code = generateExpression("var a = new Vec4(2).xywz(9);");
            code.should.equal("vec4 a = vec4(vec4(9).x, vec4(9).y, vec4(9).w, vec4(9).z);");
        });
        it("length()", function() {
            var code = generateExpression("var a = new Vec4(5).length();");
            code.should.equal("float a = length(vec4(5));");
        });
        it("length(5)", function() {
            var code = generateExpression("var a = new Vec4(1,-1, 2, 0).length(5);");
            code.should.equal("vec4 a = vec4(1, -1, 2, 0) * ( 5 / length(vec4(1, -1, 2, 0)) );");
        });
        it("normalize()", function() {
            var code = generateExpression("var a = new Vec4(1,-1, 0, 2).normalize();");
            code.should.equal("vec4 a = normalize(vec4(1, -1, 0, 2));");
        });
        it("dot()", function() {
            var code = generateExpression("var a = new Vec4(1,2,3,4).dot(-1,4,5,6)");
            code.should.equal("float a = dot(vec4(1, 2, 3, 4), vec4(-1, 4, 5, 6));");
        });
        it("add()", function() {
            var code = generateExpression("var a = new Vec4(1,2,3,4).add(5)");
            code.should.equal("vec4 a = vec4(1, 2, 3, 4) + vec4(5);");
        });
        it("sub()", function() {
            var code = generateExpression("var a = new Vec4(5).sub( new Vec2(1, 2), new Vec2(3, 4) )");
            code.should.equal("vec4 a = vec4(5) - vec4(vec2(1, 2), vec2(3, 4));");
        });
        it("mul()", function() {
            var code = generateExpression("var a = new Vec4(5).mul(2,3,1,0)");
            code.should.equal("vec4 a = vec4(5) * vec4(2, 3, 1, 0);");
        });
        it("div()", function() {
            var code = generateExpression("var a = new Vec4(5).div(new Vec4(2))");
            code.should.equal("vec4 a = vec4(5) / vec4(2);");
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
        it("this.normalizedCoords", function() {
            var code = generateExpression("this.normalizedCoords");
            code.should.match(/uniform vec3 _sys_coords;/);
            code.should.match(/gl_FragCoord.xyz \/ _sys_coords/);
        });
        it("this.normalizedCoords.xy()", function() {
            var code = generateExpression("this.normalizedCoords.xy()");
            code.should.match(/vec3\(gl_FragCoord.xyz \/ _sys_coords\).xy;/);
        });
        it("this.normalizedCoords.xy().mul(2)", function() {
            var code = generateExpression("this.normalizedCoords.xy().mul(2);");
            code.should.match(/vec3\(gl_FragCoord.xyz \/ _sys_coords\).xy \* vec2\(2\);/);
        });

    });

    it("should generate simple shader", function() {
        var code = loadAndGenerate("data/js/shader/red.js");
        code.should.match(/vec3\(1/);
    });
    it("handle return 'undefined' in main", function() {
        var code = loadAndGenerate("data/js/shader/discard.js");
        code.should.match(/discard/);
    });

});

var Shade = require(".."),
    expect = require('should'),
    codegen = require("escodegen");

var wrapFunction = function(str){
    return '(function(){' + str + '}());';
}

var getSanitizedCode = function (str, ctx) {
    str = wrapFunction(str);
    var ast = Shade.getSanitizedAst(str, ctx || {});
    var code = codegen.generate(ast, {
        format: {
            compact: true
        }
    });
    var result = code.match(/\(function\(\)\{(.+)\}\(\)\);/);
    return result && result[1];
}

var getCodeValue = function(str){
    return eval(wrapFunction(str));
}

var getSanitizedCodeValue = function(str, ctx) {
    str = wrapFunction(str);
    var ast = Shade.getSanitizedAst(str, ctx || {});
    var code = codegen.generate(ast, {
        format: {
            compact: true
        }
    });
    return eval(code);
}

var checkCodeSanitizedEqualResult = function(code){
    var valueOld = getCodeValue(code);
    var valueNew = getSanitizedCodeValue(code);
    return valueOld.should.equal(valueNew);
}


describe('Sanitizing:', function () {
    describe('New code', function () {
        it("should separate declaration from initialization", function () {
            var code = getSanitizedCode("var x = 25, y = x * 25;");
            code.should.equal("var x,y;x=25;y=x*25;");
        });
        it("should push declaration at beginning of code", function () {
            var code = getSanitizedCode("var a = 1; a += 24; var b = 2;");
            code.should.equal("var a,b;a=1;a+=24;b=2;");
        });
        it("should add top declarations in functions", function () {
            var code = getSanitizedCode("function test(a){a *= 23; var b = 42; return a >b;}; var magic=2;test(magic);");
            code.should.equal("var magic;function test(a){var b;a*=23;b=42;return a>b;};magic=2;test(magic);");
        });
        it("should separate assignments into single expressions ", function () {
            var code = getSanitizedCode("var a, b; a = b = 5;");
            code.should.equal("var a,b;b=5;a=b;");
        });
        it("should introduce temporary identifier for complicated nesting of assignments", function () {
            var code = getSanitizedCode("var a = 5; var a = a + (a=25);");
            code.should.equal("var a,_tmp0;a=5;_tmp0=a;a=25;a=_tmp0+a;");
        });
        it("should handle not introduce unnecessary temporary identifiers for nestes assignments", function () {
            var code = getSanitizedCode("var a = 5; var a = a + (a=25) + a;");
            code.should.equal("var a,_tmp0;a=5;_tmp0=a;a=25;a=_tmp0+a+a;");
        });
        it("should handle complex nested assignments", function () {
            var code = getSanitizedCode("var a = 5; var a = a + (a=25) + (a=-5);");
            code.should.equal("var a,_tmp0,_tmp1;a=5;_tmp0=a;_tmp1=25;a=-5;a=_tmp0+_tmp1+a;");
        });
        it("should handle recursively nested assignments", function () {
            var code = getSanitizedCode("var a = 5, b=2; a = 5 + (b = (a=25) - 3);");
            code.should.equal("var a,b;a=5;b=2;a=25;b=a-3;a=5+b;");
        });
        it("should handle complex nested assignments", function () {
            var code = "var a = 5, b=2; a = a + (b = (a=b-25) - 3);return a;";
            var sCode = getSanitizedCode(code);
            sCode.should.equal("var a,b,_tmp0,_tmp1;a=5;b=2;_tmp1=b;_tmp0=a;a=_tmp1-25;b=a-3;a=_tmp0+b;return a;");
            checkCodeSanitizedEqualResult(code);
        });
        it("should handle insanely complex nested assignments that nobody would ever use in the first place I mean srsly c'mon!", function () {
            var code = "var a=5.5, b=2.4; a = b*(a=5*b + (a=(b=4-a)) / (b-25 + (a=24))) / a * (b=5); return a;";
            checkCodeSanitizedEqualResult(code);
        });

        it("should handle suffix update expressions", function () {
            var code = getSanitizedCode("var a=1; a = a + (a++);");
            code.should.equal("var a,_tmp0;a=1;_tmp0=a;a=a+1;a=_tmp0+_tmp0;");
        });
        it("should handle prefix update expressions", function () {
            var code = getSanitizedCode("var a=2; a = a + (--a);");
            code.should.equal("var a,_tmp0;a=2;_tmp0=a;a=a-1;a=_tmp0+a;");
        });
        it("should handle combinations of update expressions", function () {
            var code = getSanitizedCode("var a=2; a = (a++) + (--a);");
            code.should.equal("");
        });
    });
})

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

var checkSanitized = function( code, sanitizedCode){
    if(typeof sanitizedCode == "string"){
        var sCode = getSanitizedCode(code);
        sCode.should.equal(sanitizedCode);
    }
    for(var i = 2; i < arguments.length; ++i){
        var returnVariable = arguments[i];
        var returnCode = code+="return "+returnVariable+";";
        checkCodeSanitizedEqualResult(returnCode);
    }
};


describe('Sanitizing:', function () {
    describe('Declaration simplifier', function () {
        it("should separate declaration from initialization", function () {
            checkSanitized( "var x = 25, y = x * 25;",
                            "var x,y;x=25;y=x*25;", "y");
        });
        it("should push declaration at beginning of code", function () {
            checkSanitized( "var a = 1; a += 24; var b = 2;",
                            "var a,b;a=1;a+=24;b=2;", "a");
        });
        it("should add top declarations in functions", function () {
            checkSanitized("function test(a){a *= 23; var b = 42; return a >b;}; var magic=2;test(magic);",
                            "var magic;function test(a){var b;a*=23;b=42;return a>b;};magic=2;test(magic);");
        });
    });
    describe('Statement simplifier', function () {
        describe('for assigments', function () {
            it("should separate assignments into single expressions ", function () {
                checkSanitized("var a, b; a = b = 5;","var a,b;b=5;a=b;", "a");
            });
            it("should introduce temporary identifier for complicated nesting of assignments", function () {
                checkSanitized( "var a = 5; var a = a + (a=25);",
                                "var a,_tmp0;a=5;_tmp0=a;a=25;a=_tmp0+a;", "a");
            });
            it("should handle not introduce unnecessary temporary identifiers for nestes assignments", function () {
                checkSanitized( "var a = 5; var a = a + (a=25) + a;",
                                "var a,_tmp0;a=5;_tmp0=a;a=25;a=_tmp0+a+a;", "a");
            });
            it("should handle complex nested assignments", function () {
                checkSanitized( "var a = 5; var a = a + (a=25) + (a=-5);",
                                "var a,_tmp0,_tmp1;a=5;_tmp0=a;_tmp1=25;a=-5;a=_tmp0+_tmp1+a;", "a");
            });
            it("should handle recursively nested assignments", function () {
                checkSanitized( "var a = 5, b=2; a = 5 + (b = (a=25) - 3);",
                                "var a,b;a=5;b=2;a=25;b=a-3;a=5+b;", "a", "b");
            });
            it("should handle complex nested assignments", function () {
                checkSanitized( "var a = 5, b=2; a = a + (b = (a=b-25) - 3);",
                                "var a,b,_tmp0;a=5;b=2;_tmp0=a;a=b-25;b=a-3;a=_tmp0+b;",
                                "a", "b");
            });
            it("should handle complex nested assignments #2", function () {
                checkSanitized( "var a=5.5, b=2.4; a = (a=(b=a)) / (a=24);",
                                null, "a", "b");
            });
            it("should handle insanely complex nested assignments that nobody would ever use in the first place I mean srsly c'mon!", function () {
                checkSanitized( "var a=5.5, b=2.4; a = b*(a=5*b + (a=(b=4-a)) / (b-25 + (a=24))) / a * (b=5);",
                                null, "a", "b");
            });
        });
        describe('for update expressions', function () {
            it("should handle suffix update expressions", function () {
                checkSanitized( "var a=1; a = (a++);",
                                "var a,_tmp0;a=1;_tmp0=a;a=_tmp0+1;a=_tmp0;",
                                "a");
            });
            it("should handle prefix update expressions", function () {
                checkSanitized( "var a=2; a = a + (--a);",
                                "var a,_tmp0;a=2;_tmp0=a;a=_tmp0-1;a=_tmp0+a;",
                                "a");
            });

            it("should handle combinations of update expressions", function () {
                checkSanitized("var a=2; a = (a++) + (--a);",
                               "var a,_tmp0;a=2;_tmp0=a;a=_tmp0+1;a=a-1;a=_tmp0+a;",
                               "a");
            });
            it("should handle combinations of update expressions", function () {
                checkSanitized( "var a=2; a = (++a) + (a--);",
                                "var a,_tmp0;a=2;_tmp0=a+1;a=_tmp0-1;a=_tmp0+_tmp0;",
                                "a");
            });
            it("should handle even more complex combinations of update expressions", function () {
                checkSanitized( "var b=4; b = (b++) + (b++) + (++b); return b;",
                                null, "b");
            });

            it("should handle compount assignment operators", function () {
                checkSanitized( "var x=4, y=3; x+= 5 + (y-=10);",
                                "var x,y;x=4;y=3;y=y-10;x+=5+y;",
                                "x", "y");
            });
        });

        describe('for if-statements', function () {
            it("should handle assignments inside the test", function () {
                checkSanitized( "var a=5;if( (a*=2) > 10) a=3;",
                                "var a;a=5;a=a*2;if(a>10)a=3;",
                                "a");
            });

            it("should handle assignments in recursive if statements", function () {
                checkSanitized( "var a=5;if( (a*=2) > 10) { if((a+=3)<12) a=3; else a=7; }",
                                "var a;a=5;a=a*2;if(a>10){a=a+3;if(a<12)a=3;else a=7;}", "a");
            });
        });




    });


})

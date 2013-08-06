var Shade = require(".."),
    expect = require('should');

describe('Shade',   function(){
    describe('#extractParameters()', function () {
        it('should return empty object if no parameter is present', function () {
            var result = Shade.extractParameters("function shade() {}");
            result.should.eql({});
        });
        it('should return an array with "a", if a parameter "a" is present', function () {
            var result = Shade.extractParameters("function shade(p) { return p.a; }");
            result.should.eql(['a']);
        });
        it('should return an array with "a" and "b", if a parameter "a" and "b" are present', function () {
            var result = Shade.extractParameters("function shade(p) { p.b; return p.a; }");
            result.should.include('b');
            result.should.include('a');
            result.should.have.length(2);
        });
        it('should find parametere for function calls', function () {
            var result = Shade.extractParameters("function f(a, p) {p.b;}; function shade(p) { var c = 2; f(c, p); return p.a; }");
            result.should.include('b');
            result.should.include('a');
            result.should.have.length(2);
        });
        it('should find parameters for recursive calls', function () {
            var result = Shade.extractParameters("function f(a, p) {p.b; f(a,p);}; function shade(p) { var c = 2; f(c, p); return p.a; }");
            result.should.include('b');
            result.should.include('a');
            result.should.have.length(2);
        });
    })
});

var Shade = require(".."),
    expect = require('should');

describe('Shade',   function(){
    describe('#extractParameters()', function () {
        it('should return empty object if no parameter is present', function () {
            var result = Shade.extractParameters("function shade() {}");
            result.should.eql({ shaderParameters: [], systemParameters: []});
        });
        it('should return an array with "a", if shader parameter "a" is present', function () {
            var result = Shade.extractParameters("function shade(p) { return p.a; }");
            result.should.have.property("shaderParameters");
            result.shaderParameters.should.eql(['a']);
            result.should.have.property("systemParameters");
            result.systemParameters.should.be.empty;
        });
        it('should return an array with "a" and "b", if shader parameter "a" and "b" are present', function () {
            var result = Shade.extractParameters("function shade(p) { p.b; return p.a; }");
            result.should.have.property("shaderParameters");
            var shaderParameters = result.shaderParameters;
            shaderParameters.should.include('b');
            shaderParameters.should.include('a');
            shaderParameters.should.have.length(2);
            result.systemParameters.should.be.empty;
        });
        it('should find shader parameters for function calls', function () {
            var result = Shade.extractParameters("function f(a, p) {p.b;}; function shade(p) { var c = 2; f(c, p); return p.a; }");
            result.should.have.property("shaderParameters");
            var shaderParameters = result.shaderParameters;
            shaderParameters.should.include('b');
            shaderParameters.should.include('a');
            shaderParameters.should.have.length(2);
            result.systemParameters.should.be.empty;
        });
        it('should find shader parameters for recursive calls', function () {
            var result = Shade.extractParameters("function f(a, p) {p.b; f(a,p);}; function shade(p) { var c = 2; f(c, p); return p.a; }");
            result.should.have.property("shaderParameters");
            var shaderParameters = result.shaderParameters;
            shaderParameters.should.include('b');
            shaderParameters.should.include('a');
            shaderParameters.should.have.length(2);
            result.systemParameters.should.be.empty;
        });

        it('should find system parameters for recursive calls', function () {
            var result = Shade.extractParameters("function f(a, p, that) {p.b; that.w; f(a,p, this.s);}; function shade(p) { var c = 2; f(c, p, this); this.x; return p.a; }");
            result.should.have.property("shaderParameters");
            var shaderParameters = result.shaderParameters;
            shaderParameters.should.include('b');
            shaderParameters.should.include('a');
            shaderParameters.should.have.length(2);
            var systemParameters = result.systemParameters;
            // systemParameters.should.include('w'); TODO
            systemParameters.should.include('x');
            systemParameters.should.include('s');
            systemParameters.should.have.length(2);
        });
    })
});

var Shade = require(".."),
    expect = require('should');

describe('Shade',   function(){
    describe('#extractParameters()', function () {
        it('should return empty object if no parameter is present', function () {
            var result = Shade.extractParameters("function shade() {}");
            result.should.eql({});
        });
        it('should return an object with property "a", if a parameter "a" is present', function () {
            var result = Shade.extractParameters("function shade(p) { return p.a; }");
            //result.should.have.property('a');
            //result.should.eql({ a: {} });
        });
    })
});

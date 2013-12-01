var Shade = require(".."), expect = require('should');

var parseAndInferenceExpression = function (str) {
    var aast = Shade.analyze(str, { throwOnError: true, validate: true });
    return aast.body;
};

describe('Error:', function () {

    describe('TypeError should be thrown', function () {

        it("calling unknown method on object", function () {
            var exp = "var x = new Vec3(128); x.something();";
            var analyze = parseAndInferenceExpression.bind(null, exp);
            analyze.should.throw(/TypeError: .* has no method 'something'/);
        });

        it("accessing property of undefined", function () {
            var exp = "var x = new Vec3(); x.something.x;";
            var analyze = parseAndInferenceExpression.bind(null, exp);
            analyze.should.throw(/TypeError: Cannot read property 'x' of undefined/);
        });


    }),

    describe('ReferenceError should be thrown', function () {

        it("using a undefined variable", function () {
            var exp = "Math.cos(a);";
            var analyze = parseAndInferenceExpression.bind(null, exp);
            analyze.should.throw("ReferenceError: a is not defined");
        });

        it("calling new on undefined function", function () {
            var exp = "new UnknownFunction();";
            var analyze = parseAndInferenceExpression.bind(null, exp);
            analyze.should.throw("ReferenceError: UnknownFunction is not defined");
        });

    })


});

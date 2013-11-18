var Shade = require(".."),
    expect = require('should'),
    TYPES = Shade.TYPES;


var parseAndInferenceExpression = function (str, ctx) {
    var aast = Shade.parseAndInferenceExpression(str, ctx || {});
    return aast.body[0].expression;
}

describe('Inference:', function () {
    describe('Object Registry', function () {
        describe('for Math object', function () {
            it("constant Math.PI ? number", function () {
                var exp = parseAndInferenceExpression("Math.PI");
                exp.should.have.property("extra");
                exp.extra.should.have.property("type", TYPES.NUMBER);
                exp.extra.should.have.property("staticValue", Math.PI);

            });
            it("access unknown property ? undefined", function () {
                var exp = parseAndInferenceExpression("Math.XPI");
                exp.should.have.property("extra");
                exp.extra.should.have.property("type", TYPES.UNDEFINED);
            });
            it("call Math.cos(number) ? number", function () {
                var exp = parseAndInferenceExpression("Math.cos(0.0)");
                exp.should.have.property("extra");
                exp.extra.should.have.property("type", TYPES.NUMBER);
                exp.extra.should.have.property("staticValue", 1);
            });
            it("call Math.atan2(number,number) ? number", function () {
                var exp = parseAndInferenceExpression("Math.atan2(Math.PI, 0)");
                exp.should.have.property("extra");
                exp.extra.should.have.property("type", TYPES.NUMBER);
                exp.extra.should.have.property("staticValue", Math.PI / 2);
            });
            it("call Math.min(number,number,...) ? number", function () {
                var exp = parseAndInferenceExpression("Math.min(Math.PI, 4, -1)");
                exp.should.have.property("extra");
                exp.extra.should.have.property("type", TYPES.NUMBER);
                exp.extra.should.have.property("staticValue", -1);
            });
            it("call Math.floor(number) ? number", function () {
                var exp = parseAndInferenceExpression("Math.floor(5.5)");
                exp.should.have.property("extra");
                exp.extra.should.have.property("type", TYPES.NUMBER);
                exp.extra.should.have.property("staticValue", 5);
            });
            it("Math.cos(number, number) ? throw invalid number of parameters", function () {
                var evaluation = parseAndInferenceExpression.bind(undefined, "Math.cos(0.0, 2.0)");
                evaluation.should.throw(/Invalid number of parameters/);
            });
            it("Math.cos(string) ? throw invalid parameters type", function () {
                var evaluation = parseAndInferenceExpression.bind(undefined, "Math.cos('hallo')");
                evaluation.should.throw(/Parameter 0 has invalid type/);
            });
            it("throws for unknown method", function () {
                var evaluation = parseAndInferenceExpression.bind(undefined, "Math.foo(5.0)");
                evaluation.should.throw(/has no method/);
            });
        });
    });

});

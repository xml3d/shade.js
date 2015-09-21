var Shade = require(".."),
    expect = require('should'),
    TYPES = Shade.TYPES,
    KINDS = Shade.OBJECT_KINDS;


var parseAndInferenceExpression = function (str, ctx) {
    var aast = Shade.parseAndInferenceExpression(str, ctx || {});
    return aast.body[0].expression;
}

describe('Inference:', function () {
    describe('Math extensions', function () {
        it("Math.clamp", function () {
            var exp = parseAndInferenceExpression("Math.clamp(1.5, 0.0, 1.0);");
            exp.should.have.property("extra");
            exp.extra.should.have.property("type", TYPES.NUMBER);
            exp.extra.should.have.property("constantValue", 1.0);

            exp = parseAndInferenceExpression("Math.clamp(-1.5, 0.0, -1.0);");
            exp.should.have.property("extra");
            exp.extra.should.have.property("type", TYPES.NUMBER);
            exp.extra.should.have.property("constantValue", -1);
        });
        it("Math.smoothstep", function () {
            var exp = parseAndInferenceExpression("Math.smoothstep(1,0,0.75);");
            exp.should.have.property("extra");
            exp.extra.should.have.property("type", TYPES.NUMBER);
            exp.extra.should.have.property("constantValue", 0.15625);
        });
        it("Math.step", function () {
            var exp = parseAndInferenceExpression("Math.step(0.5, 0.4);");
            exp.should.have.property("extra");
            exp.extra.should.have.property("type", TYPES.NUMBER);
            exp.extra.should.have.property("constantValue", 0);

            exp = parseAndInferenceExpression("Math.step(0.5, 0.6);");
            exp.should.have.property("extra");
            exp.extra.should.have.property("type", TYPES.NUMBER);
            exp.extra.should.have.property("constantValue", 1);
        });
        it("Math.fract", function () {
            var exp = parseAndInferenceExpression("Math.fract(3.5);");
            exp.should.have.property("extra");
            exp.extra.should.have.property("type", TYPES.NUMBER);
            exp.extra.should.have.property("constantValue", 0.5);
        });
    });

    xdescribe('system variables', function () {

        it("this.coords", function () {
            var exp = parseAndInferenceExpression("this.coords");
            exp = exp[0];
            exp.should.have.property("extra");
            exp.extra.should.have.property("type", TYPES.OBJECT);
            exp.extra.should.have.property("kind", TYPES.FLOAT3);

            var exp = parseAndInferenceExpression("this.coords.x()");
            exp = exp[0];
            exp.should.have.property("extra");
            exp.extra.should.have.property("type", TYPES.NUMBER);
        });

        it("this.normalizedCoords", function () {
            var exp = parseAndInferenceExpression("this.normalizedCoords");
            exp = exp[0];
            exp.should.have.property("extra");
            exp.extra.should.have.property("type", TYPES.OBJECT);
            exp.extra.should.have.property("kind", TYPES.FLOAT3);

            var exp = parseAndInferenceExpression("this.normalizedCoords.x()");
            exp = exp[0];
            exp.should.have.property("extra");
            exp.extra.should.have.property("type", TYPES.NUMBER);
        });

    });

});

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

    describe('system variables', function () {

        it("this.coords", function () {
            var exp = parseAndInferenceExpression("this.coords");
            exp.should.have.property("extra");
            exp.extra.should.have.property("type", TYPES.OBJECT);
            exp.extra.should.have.property("kind", "Vec3");

            var exp = parseAndInferenceExpression("this.coords.x()");
            exp.should.have.property("extra");
            exp.extra.should.have.property("type", TYPES.NUMBER);
        });

        it("this.height", function () {
            var exp = parseAndInferenceExpression("this.height");
            exp.should.have.property("extra");
            exp.extra.should.have.property("type", TYPES.INT);
        });

        it("this.width", function () {
            var exp = parseAndInferenceExpression("this.width");
            exp.should.have.property("extra");
            exp.extra.should.have.property("type", TYPES.INT);
        });

        it("this.normalizedCoords", function () {
            var exp = parseAndInferenceExpression("this.normalizedCoords");
            exp.should.have.property("extra");
            exp.extra.should.have.property("type", TYPES.OBJECT);
            exp.extra.should.have.property("kind", "Vec3");

            var exp = parseAndInferenceExpression("this.normalizedCoords.x()");
            exp.should.have.property("extra");
            exp.extra.should.have.property("type", TYPES.NUMBER);
        });

    });

});

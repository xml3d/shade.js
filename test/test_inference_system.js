var Shade = require(".."),
    expect = require('should'),
    TYPES = Shade.TYPES,
    KINDS = Shade.OBJECT_KINDS;


var parseAndInferenceExpression = function (str, ctx) {
    var aast = Shade.parseAndInferenceExpression(str, ctx || {});
    return aast.body;
}

describe('Inference', function () {
    describe('static method', function () {
        it("Shade.clamp", function () {
            var exp = parseAndInferenceExpression("Shade.clamp(1.5, 0.0, 1.0);");
            exp = exp[0];
            exp.should.have.property("extra");
            exp.extra.should.have.property("type", TYPES.NUMBER);
            exp.extra.should.have.property("staticValue", 1.0);

            exp = parseAndInferenceExpression("Shade.clamp(-1.5, 0.0, -1.0);");
            exp = exp[0];
            exp.should.have.property("extra");
            exp.extra.should.have.property("type", TYPES.NUMBER);
            exp.extra.should.have.property("staticValue", -1);
        });
        it("Shade.smoothstep", function () {
            var exp = parseAndInferenceExpression("Shade.smoothstep(1,0,0.75);");
            exp = exp[0];
            exp.should.have.property("extra");
            exp.extra.should.have.property("type", TYPES.NUMBER);
            exp.extra.should.have.property("staticValue", 0.15625);
        });
        it("Shade.step", function () {
            var exp = parseAndInferenceExpression("Shade.step(0.5, 0.4);");
            exp = exp[0];
            exp.should.have.property("extra");
            exp.extra.should.have.property("type", TYPES.NUMBER);
            exp.extra.should.have.property("staticValue", 0);

            exp = parseAndInferenceExpression("Shade.step(0.5, 0.6);");
            exp = exp[0];
            exp.should.have.property("extra");
            exp.extra.should.have.property("type", TYPES.NUMBER);
            exp.extra.should.have.property("staticValue", 1);
        });
        it("Shade.fract", function () {
            var exp = parseAndInferenceExpression("Shade.fract(3.5);");
            exp = exp[0];
            exp.should.have.property("extra");
            exp.extra.should.have.property("type", TYPES.NUMBER);
            exp.extra.should.have.property("staticValue", 0.5);
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

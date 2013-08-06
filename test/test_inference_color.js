var Shade = require(".."),
    expect = require('should'),
    TYPES = Shade.TYPES,
    KINDS = Shade.OBJECT_KINDS;


var parseAndInferenceExpression = function (str, ctx) {
    var aast = Shade.parseAndInferenceExpression(str, ctx || {});
    return aast.body[0];
}

describe('Inference', function () {
    describe('Object Registry', function () {
        describe('for Color::', function () {

            it("rgb => object<color>", function () {
                var exp = parseAndInferenceExpression("Color.rgb(255, 0, 0)");
                exp.should.have.property("extra");
                exp.extra.should.have.property("type", TYPES.OBJECT);
                exp.extra.should.have.property("kind", KINDS.COLOR);
                exp.extra.should.have.property("staticValue");
                exp.extra.staticValue.should.have.property("r", 255);
                exp.extra.staticValue.should.have.property("g", 0);
                exp.extra.staticValue.should.have.property("b", 0);

            });

            it("color instance object<color>", function () {
                var exp = parseAndInferenceExpression("new Color(255, 0, 0)");
                exp.should.have.property("extra");
                exp.extra.should.have.property("type", TYPES.OBJECT);
                exp.extra.should.have.property("kind", KINDS.COLOR);
                exp.extra.should.have.property("staticValue");
                exp.extra.staticValue.should.have.property("r", 255);
                exp.extra.staticValue.should.have.property("g", 0);
                exp.extra.staticValue.should.have.property("b", 0);

            });

            it("color instance object<color>", function () {
                var exp = parseAndInferenceExpression("new Color(128)");
                exp.should.have.property("extra");
                exp.extra.should.have.property("type", TYPES.OBJECT);
                exp.extra.should.have.property("kind", KINDS.COLOR);
                exp.extra.should.have.property("staticValue");
                exp.extra.staticValue.should.have.property("r", 128);
                exp.extra.staticValue.should.have.property("g", 128);
                exp.extra.staticValue.should.have.property("b", 128);

            });



        });
    });

});

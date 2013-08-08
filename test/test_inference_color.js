var Shade = require(".."),
    expect = require('should'),
    TYPES = Shade.TYPES,
    KINDS = Shade.OBJECT_KINDS;


var parseAndInferenceExpression = function (str, ctx) {
    var aast = Shade.parseAndInferenceExpression(str, ctx || {});
    return aast.body;
}

describe('Inference', function () {
    describe('Object Registry', function () {
        describe('for Color::', function () {

            it("rgb => object<color>", function () {
                var exp = parseAndInferenceExpression("Color.rgb(255, 0, 0)");
                exp = exp[0];
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
                exp = exp[0];
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
                exp = exp[0];
                exp.should.have.property("extra");
                exp.extra.should.have.property("type", TYPES.OBJECT);
                exp.extra.should.have.property("kind", KINDS.COLOR);
                exp.extra.should.have.property("staticValue");
                exp.extra.staticValue.should.have.property("r", 128);
                exp.extra.staticValue.should.have.property("g", 128);
                exp.extra.staticValue.should.have.property("b", 128);

            });

            xit("color instance properties", function () {
                var exp = parseAndInferenceExpression("var x = new Color(128); x.r");
                var memexp = exp[1].expression;

                // object
                var object = memexp.object;
                object.should.have.property("extra");
                object.extra.should.have.property("type", TYPES.OBJECT);
                object.extra.should.have.property("kind", KINDS.COLOR);

                // property
                var property = memexp.property;
                property.should.have.property("extra");
                property.extra.should.have.property("type", TYPES.NUMBER);

                // expr
                memexp.should.have.property("extra");
                memexp.extra.should.have.property("type", TYPES.NUMBER);
            });

            it("color instance methods", function () {
                var exp = parseAndInferenceExpression("var x = new Color(128); x.intensity();");
                var memexp = exp[1].expression;

                // object
                var object = memexp.object;
                object.should.have.property("extra");
                object.extra.should.have.property("type", TYPES.OBJECT);
                object.extra.should.have.property("kind", KINDS.COLOR);

                // property
                var property = memexp.property;
                property.should.have.property("extra");
                property.extra.should.have.property("type", TYPES.NUMBER);

                // expr
                memexp.should.have.property("extra");
                memexp.extra.should.have.property("type", TYPES.NUMBER);
            });



        });
    });

});

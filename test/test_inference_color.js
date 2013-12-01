var Shade = require(".."),
    expect = require('should'),
    TYPES = Shade.TYPES,
    KINDS = Shade.OBJECT_KINDS;


var parseAndInferenceExpression = function (str, ctx) {
    var aast = Shade.parseAndInferenceExpression(str, ctx || { throwOnError: true });
    return aast.body;
}

describe('Inference:', function () {
    describe('Object Registry', function () {
       describe('for Color::', function () {


            it("constructor, 3 args", function () {
                var exp = parseAndInferenceExpression("new Color(1.0, 0, 0)");
                exp = exp[0].expression;
                exp.should.have.property("extra");
                exp.extra.should.have.property("type", TYPES.OBJECT);
                exp.extra.should.have.property("kind", KINDS.FLOAT3);
                exp.extra.should.have.property("staticValue");
                exp.extra.staticValue.should.have.property("0", 1.0);
                exp.extra.staticValue.should.have.property("1", 0);
                exp.extra.staticValue.should.have.property("2", 0);

            });

            it("color instance object<color> one arg", function () {
                var exp = parseAndInferenceExpression("new Color(128)");
                exp = exp[0].expression;
                exp.should.have.property("extra");
                exp.extra.should.have.property("type", TYPES.OBJECT);
                exp.extra.should.have.property("kind", KINDS.FLOAT3);
                exp.extra.should.have.property("staticValue");
                exp.extra.staticValue.should.have.property("0", 128);
                exp.extra.staticValue.should.have.property("1", 128);
                exp.extra.staticValue.should.have.property("2", 128);

            });

            it("color instance swizzle", function () {
                var exp = parseAndInferenceExpression("var x = new Color(128); x.r()");
                var callexp = exp[1].expression;

                // object
                var object = callexp.callee.object;
                object.should.have.property("extra");
                object.extra.should.have.property("type", TYPES.OBJECT);
                object.extra.should.have.property("kind", KINDS.FLOAT3);

                // property
                var property = callexp.callee.property;
                property.should.have.property("extra");
                property.extra.should.have.property("type", TYPES.FUNCTION);

                // expr
                callexp.should.have.property("extra");
                callexp.extra.should.have.property("type", TYPES.NUMBER);
            });

            it("color instance methods", function () {
                var exp = parseAndInferenceExpression("var x = new Color(128); x.mul(new Color());");
                var callExpression = exp[1].expression;

                // object
                var object = callExpression.callee.object;
                object.should.have.property("extra");
                object.extra.should.have.property("type", TYPES.OBJECT);
                object.extra.should.have.property("kind", KINDS.FLOAT3);

                // property
                var property = callExpression.callee.property;
                property.should.have.property("extra");
                property.extra.should.have.property("type", TYPES.FUNCTION);

                // expr
                callExpression.should.have.property("extra");
                callExpression.extra.should.have.property("type", TYPES.OBJECT);
                callExpression.extra.should.have.property("kind", TYPES.FLOAT3);
            });

            it("unknown color method should throw", function () {
                var exp = parseAndInferenceExpression.bind(null, "var x = new Color(128); x.something();");
                exp.should.throw(/has no method 'something'/);
            });

        });
    });

});

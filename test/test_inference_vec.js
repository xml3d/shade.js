var Shade = require(".."),
    expect = require('should'),
    TYPES = Shade.TYPES,
    KINDS = Shade.OBJECT_KINDS;


var parseAndInferenceExpression = function (str, ctx) {
    var aast = Shade.parseAndInferenceExpression(str, ctx || {});
    return aast.body;
}

describe('Inference:', function () {
    describe('Object Registry', function () {
       describe('for Vec2', function () {

            it("constructor, 0 args", function () {
                var exp = parseAndInferenceExpression("new Vec2()");
                exp = exp[0].expression;
                exp.should.have.property("extra");
                exp.extra.should.have.property("type", TYPES.OBJECT);
                exp.extra.should.have.property("kind", KINDS.FLOAT2);
                exp.extra.should.have.property("staticValue");
                exp.extra.staticValue.should.have.property("0", 0);
                exp.extra.staticValue.should.have.property("1", 0);

                exp = parseAndInferenceExpression("new Vec2().x()");
                exp = exp[0].expression;
                exp.should.have.property("extra");
                exp.extra.should.have.property("type", TYPES.NUMBER);
                exp.extra.should.have.property("staticValue", 0);

            });

           it("constructor, 1 args", function () {
               var exp = parseAndInferenceExpression("new Vec2(1.0)");
               exp = exp[0].expression;
               exp.should.have.property("extra");
               exp.extra.should.have.property("type", TYPES.OBJECT);
               exp.extra.should.have.property("kind", KINDS.FLOAT2);
               exp.extra.should.have.property("staticValue");
               exp.extra.staticValue.should.have.property("0", 1.0);
               exp.extra.staticValue.should.have.property("1", 1.0);

               exp = parseAndInferenceExpression("new Vec2(1.0).x()");
               exp = exp[0].expression;
               exp.should.have.property("extra");
               exp.extra.should.have.property("type", TYPES.NUMBER);
               exp.extra.should.have.property("staticValue", 1);

           });

           it("constructor, 2 args", function () {
               var exp = parseAndInferenceExpression("new Vec2(1.0, 2.0)");
               exp = exp[0].expression;
               exp.should.have.property("extra");
               exp.extra.should.have.property("type", TYPES.OBJECT);
               exp.extra.should.have.property("kind", KINDS.FLOAT2);
               exp.extra.should.have.property("staticValue");
               exp.extra.staticValue.should.have.property("0", 1.0);
               exp.extra.staticValue.should.have.property("1", 2.0);

           });

           it("property accessor functions", function () {
               var exp = parseAndInferenceExpression("new Vec2(1.0, 2.0).x()");
               exp = exp[0].expression;
               exp.should.have.property("extra");
               exp.extra.should.have.property("type", TYPES.NUMBER);
               exp.extra.should.have.property("staticValue", 1);

               exp = parseAndInferenceExpression("new Vec2(1.0, 2.0).y()");
               exp = exp[0].expression;
               exp.should.have.property("extra");
               exp.extra.should.have.property("type", TYPES.NUMBER);
               exp.extra.should.have.property("staticValue", 2);

               exp = parseAndInferenceExpression("var a = new Vec2(1, 2).xy(); a.x()");
               exp = exp[1].expression;
               exp.should.have.property("extra");
               exp.extra.should.have.property("type", TYPES.NUMBER);

           });





       });
    });

});

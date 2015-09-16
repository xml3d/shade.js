var Shade = require(".."),
    expect = require('should'),
    TYPES = Shade.TYPES,
    KINDS = Shade.OBJECT_KINDS;


var parseAndInferenceExpression = function (str, ctx) {
    var aast = Shade.parseAndInferenceExpression(str, ctx || {});
    return aast.body;
}

describe('Inference:', function () {
    describe.only('Object Registry', function () {
       describe('for Vec2', function () {

		   it("find constructor", function () {
                var exp = parseAndInferenceExpression("typeof Vec2");
                exp = exp[0].expression;
                exp.should.have.property("extra");
                exp.extra.should.have.property("type", TYPES.STRING);
                exp.extra.should.have.property("constantValue", "function");

			   /*var exp = parseAndInferenceExpression("new Vec2() instanceof Vec2");
                exp = exp[0].expression;
                exp.should.have.property("extra");
                exp.extra.should.have.property("type", TYPES.BOOLEAN);
                exp.extra.should.have.property("constantValue", "true");*/


            });

            it("constructor, 0 args", function () {
                var exp = parseAndInferenceExpression("new Vec2()");
                exp = exp[0].expression;
                exp.should.have.property("extra");
                exp.extra.should.have.property("type", TYPES.OBJECT);
                exp.extra.should.have.property("kind", "Vec2");
                exp.extra.should.have.property("constantValue");
                exp.extra.constantValue.should.have.property("0", 0);
                exp.extra.constantValue.should.have.property("1", 0);

                exp = parseAndInferenceExpression("new Vec2().x()");
                exp = exp[0].expression;
                exp.should.have.property("extra");
                exp.extra.should.have.property("type", TYPES.NUMBER);
                exp.extra.should.have.property("constantValue", 0);

            });

           it("constructor, 1 args", function () {
               var exp = parseAndInferenceExpression("new Vec2(1.0)");
               exp = exp[0].expression;
               exp.should.have.property("extra");
               exp.extra.should.have.property("type", TYPES.OBJECT);
               exp.extra.should.have.property("kind", "Vec2");
               exp.extra.should.have.property("constantValue");
               exp.extra.constantValue.should.have.property("0", 1.0);
               exp.extra.constantValue.should.have.property("1", 1.0);

               exp = parseAndInferenceExpression("new Vec2(1.0).x()");
               exp = exp[0].expression;
               exp.should.have.property("extra");
               exp.extra.should.have.property("type", TYPES.NUMBER);
               exp.extra.should.have.property("constantValue", 1);

           });

           it("constructor, 2 args", function () {
               var exp = parseAndInferenceExpression("new Vec2(1.0, 2.0)");
               exp = exp[0].expression;
               exp.should.have.property("extra");
               exp.extra.should.have.property("type", TYPES.OBJECT);
               exp.extra.should.have.property("kind", "Vec2");
               exp.extra.should.have.property("constantValue");
               exp.extra.constantValue.should.have.property("0", 1.0);
               exp.extra.constantValue.should.have.property("1", 2.0);

           });

           it("property accessor functions", function () {
               var exp = parseAndInferenceExpression("new Vec2(1.0, 2.0).x()");
               exp = exp[0].expression;
               exp.should.have.property("extra");
               exp.extra.should.have.property("type", TYPES.NUMBER);
               exp.extra.should.have.property("constantValue", 1);

               exp = parseAndInferenceExpression("new Vec2(1.0, 2.0).y()");
               exp = exp[0].expression;
               exp.should.have.property("extra");
               exp.extra.should.have.property("type", TYPES.NUMBER);
               exp.extra.should.have.property("constantValue", 2);

               exp = parseAndInferenceExpression("var a = new Vec2(1, 2).xy(); a.x()");
               exp = exp[1].expression;
               exp.should.have.property("extra");
               exp.extra.should.have.property("type", TYPES.NUMBER);

           });

           it("swizzle accessor functions", function () {
               var exp = parseAndInferenceExpression("new Vec2(1.0, 2.0).xy()");
               exp = exp[0].expression;
               exp.should.have.property("extra");
               exp.extra.should.have.property("type", TYPES.OBJECT);
               exp.extra.should.have.property("constantValue");
               exp.extra.constantValue.should.have.property("0", 1.0);
               exp.extra.constantValue.should.have.property("1", 2.0);

               var exp = parseAndInferenceExpression("new Vec2(1.0, 2.0).yx()");
               exp = exp[0].expression;
               exp.should.have.property("extra");
               exp.extra.should.have.property("type", TYPES.OBJECT);
               exp.extra.should.have.property("constantValue");
               exp.extra.constantValue.should.have.property("0", 2.0);
               exp.extra.constantValue.should.have.property("1", 1.0);

               var exp = parseAndInferenceExpression("new Vec3(1, 2, 3).yyy()");
               exp = exp[0].expression;
               exp.should.have.property("extra");
               exp.extra.should.have.property("type", TYPES.OBJECT);
               exp.extra.should.have.property("constantValue");
               exp.extra.constantValue.should.have.property("0", 2);
               exp.extra.constantValue.should.have.property("1", 2);
               exp.extra.constantValue.should.have.property("2", 2);

               exp = parseAndInferenceExpression("new Vec3(1, 2, 3).zyx().bgr()");
               exp = exp[0].expression;
               exp.should.have.property("extra");
               exp.extra.should.have.property("type", TYPES.OBJECT);
               exp.extra.should.have.property("constantValue");
               exp.extra.constantValue.should.have.property("0", 1);
               exp.extra.constantValue.should.have.property("1", 2);
               exp.extra.constantValue.should.have.property("2", 3);

			   exp = parseAndInferenceExpression("new Vec4(1, 2, 3, 4).wzyx().abgr()");
               exp = exp[0].expression;
               exp.should.have.property("extra");
               exp.extra.should.have.property("type", TYPES.OBJECT);
               exp.extra.should.have.property("constantValue");
               exp.extra.constantValue.should.have.property("0", 1);
               exp.extra.constantValue.should.have.property("1", 2);
               exp.extra.constantValue.should.have.property("2", 3);
			   exp.extra.constantValue.should.have.property("3", 4);

           });




       });
    });

});

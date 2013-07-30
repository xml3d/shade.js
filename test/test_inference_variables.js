var Shade = require(".."),
    expect = require('should'),
    TYPES = Shade.TYPES,
    KINDS = Shade.OBJECT_KINDS;


var parseAndInferenceExpression = function (str, ctx) {
    var aast = Shade.parseAndInferenceExpression(str, ctx || {});
    return aast.body;
}

describe('Inference:', function () {
    describe('Variable initialization', function () {

        it("is annotated for no init expression", function () {
            var body = parseAndInferenceExpression("var a;");
            var declaration = body[0].declarations[0];
            declaration.should.have.property("extra");
            declaration.extra.should.have.property("type", TYPES.UNDEFINED);
        });

        it("is annotated for simple expression", function () {
            var body = parseAndInferenceExpression("var a = 5;");
            var declaration = body[0].declarations[0];
            declaration.should.have.property("extra");
            declaration.extra.should.have.property("type", TYPES.INT);
            declaration.extra.should.have.property("staticValue", 5);
        });

        it("is annotated for expression", function () {
            var body = parseAndInferenceExpression("var a = 5.0 * (3 + 4);");
            var declaration = body[0].declarations[0];
            declaration.should.have.property("extra");
            declaration.extra.should.have.property("type", TYPES.NUMBER);
            declaration.extra.should.have.property("staticValue", 35);
        });

    });

    describe('Variable reassignment', function () {

        it("of same type is okay", function () {
            var body = parseAndInferenceExpression("var a = 5; a = 3;");
            var declaration = body[0].declarations[0];
            declaration.should.have.property("extra");
            declaration.extra.should.have.property("type", TYPES.INT);
            declaration.extra.should.have.property("staticValue", 5);

            var exp = body[1];
            exp.should.have.property("extra");
            exp.extra.should.have.property("type", TYPES.INT);
            exp.extra.should.have.property("staticValue", 3);
        });

        it("of uninitialized variable is okay", function () {
            var body = parseAndInferenceExpression("var a; a = 3;");
            var declaration = body[0].declarations[0];
            declaration.should.have.property("extra");
            declaration.extra.should.have.property("type", TYPES.UNDEFINED);

            var exp = body[1];
            exp.should.have.property("extra");
            exp.extra.should.have.property("type", TYPES.INT);
            exp.extra.should.have.property("staticValue", 3);
        });

        it("with change of type throws", function () {
            var exp = parseAndInferenceExpression.bind(null, "var a = true; a = 3;");
            exp.should.throw();
        });


    });


});

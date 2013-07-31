var Shade = require(".."),
    expect = require('should'),
    TYPES = Shade.TYPES,
    KINDS = Shade.OBJECT_KINDS;


var parseAndInferenceExpression = function (str, ctx) {
    var aast = Shade.parseAndInferenceExpression(str, ctx || {});
    return aast;
}

describe('Inference:', function () {
    describe('Functions', function () {

        it("are annotated", function () {
            var program = parseAndInferenceExpression("function a(){};");
            var func = program.body[0];

            program.should.have.property("context");
            program.context.should.have.property("name", "global");
            program.context.should.have.property("bindings").property("a").property("type", TYPES.FUNCTION);

            func.should.have.property("extra");
            func.extra.should.have.property("type", TYPES.FUNCTION);
            func.extra.should.have.property("returnInfo").property("type", TYPES.UNDEFINED);
            func.should.have.property("context");
            func.context.should.have.property("name", "a");

            func.context.should.not.equal(program.context);

        });

        it("should have own scope.", function () {
            var program = parseAndInferenceExpression("function a(){ var b = 5;};");
            var func = program.body[0];

            program.should.have.property("context");
            program.context.should.have.property("name", "global");
            program.context.bindings.should.have.property("a").property("type", TYPES.FUNCTION);
            program.context.bindings.should.not.have.property("b");

            func.should.have.property("extra");
            func.extra.should.have.property("type", TYPES.FUNCTION);
            func.extra.should.have.property("returnInfo").property("type", TYPES.UNDEFINED);
            func.should.have.property("context");
            func.context.should.have.property("name", "a");

            func.context.bindings.should.have.property("b").property("type", TYPES.INT);
            func.context.bindings.should.not.have.property("a");


        });
        it("annotate static return type.", function () {
            var program = parseAndInferenceExpression("function a(){ var b = 5; return b; };");
            var func = program.body[0];

            func.should.have.property("extra");
            func.extra.should.have.property("type", TYPES.FUNCTION);
            func.extra.should.have.property("returnInfo");
            func.extra.returnInfo.should.have.property("type", TYPES.INT);
            func.extra.returnInfo.should.have.property("staticValue", 5);

        });


    });


});

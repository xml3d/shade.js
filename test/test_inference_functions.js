var Shade = require(".."),
    expect = require('should'),
    TYPES = Shade.TYPES,
    KINDS = Shade.OBJECT_KINDS;


var parseAndInferenceExpression = function (str, opt) {
    opt = opt || {};
    var aast = Shade.parseAndInferenceExpression(str, opt);
    return aast;
}

describe('Inference:', function () {
    describe.only('Functions', function () {

        it("are annotated", function () {
            var program = parseAndInferenceExpression("function a(){};", { entry: "global.a" });
            var func = program.body[0];

            program.should.have.property("scope");
            program.scope.should.have.property("name", "global");
            program.scope.should.have.property("bindings").property("a").property("extra").property("type", TYPES.FUNCTION);

            func.should.have.property("extra");
            func.extra.should.have.property("type", TYPES.FUNCTION);
            func.extra.should.have.property("returnInfo").property("type", TYPES.UNDEFINED);
            func.should.have.property("scope");
            func.scope.should.have.property("name", "a");

            func.scope.should.not.equal(program.scope);

        });

        it("should have own scope.", function () {
            var program = parseAndInferenceExpression("function a(){ var b = 5;};", { entry: "global.a" });
            var func = program.body[0];

            program.should.have.property("scope");
            program.scope.should.have.property("name", "global");
            program.scope.bindings.should.have.property("a").property("extra").property("type", TYPES.FUNCTION);
            program.scope.bindings.should.not.have.property("b");

            func.should.have.property("extra");
            func.extra.should.have.property("type", TYPES.FUNCTION);
            func.extra.should.have.property("returnInfo").property("type", TYPES.UNDEFINED);
            func.should.have.property("scope");
            func.scope.should.have.property("name", "a");

            func.scope.bindings.should.have.property("b").property("extra").property("type", TYPES.INT);
            func.scope.bindings.should.not.have.property("a");


        });
        it("annotate static return type.", function () {
            var program = parseAndInferenceExpression("function a(){ var b = 5; return b; };", { entry: "global.a" });
            var func = program.body[0];

            func.should.have.property("extra");
            func.extra.should.have.property("type", TYPES.FUNCTION);
            func.extra.should.have.property("returnInfo");
            func.extra.returnInfo.should.have.property("type", TYPES.INT);
            func.extra.returnInfo.should.not.have.property("staticValue");

        });


    });


});

var Shade = require(".."),
    expect = require('should'),
    TYPES = Shade.TYPES,
    KINDS = Shade.OBJECT_KINDS;


var parseAndInferenceExpression = function (str, ctx) {
    var aast = Shade.parseAndInferenceExpression(str, ctx || {});
    return aast;
}

describe('Inference of Statements:', function () {
    describe('ForLoops', function () {
        it("should have it's own context", function() {
            var program = parseAndInferenceExpression("for (var i = 0; i < 10; i++) {}");
            var loop = program.body[0];
            program.should.have.property("context");
            loop.should.have.property("context");
            program.context.name.should.not.equal(loop.context.name);
            var bindings = loop.context.bindings;
            bindings.should.have.property("i");
        });
        it("annotation on initialized values", function() {
            var program = parseAndInferenceExpression("for (var i = 0, j = 1.5, k; i < 10; i++) {}");
            var loop = program.body[0];
            loop.should.have.property("context");
            var bindings = loop.context.bindings;

            bindings.should.have.property("i");
            var i = bindings.i;
            i.extra.should.have.property("type", TYPES.INT);
            i.extra.should.not.have.property("staticValue");

            bindings.should.have.property("j");
            var j = bindings.j;
            j.extra.should.have.property("type", TYPES.NUMBER);
            j.extra.should.not.have.property("staticValue");
            j.should.have.property("initialized", true);

            bindings.should.have.property("k");
            var k = bindings.k;
            k.extra.should.have.property("type", TYPES.UNDEFINED);
            k.should.have.property("initialized", false);
        });
    });
});

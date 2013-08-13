var Shade = require(".."),
    expect = require('should'),
    TYPES = Shade.TYPES,
    KINDS = Shade.OBJECT_KINDS;


var parseAndInferenceExpression = function (str, ctx) {
    var aast = Shade.parseAndInferenceExpression(str, ctx || {});
    return aast.body;
}

describe('Inference', function () {
    xdescribe('system variables', function () {

            it("this.coord", function () {
                var exp = parseAndInferenceExpression("this.coord");
                exp = exp[0];
                exp.should.have.property("extra");
                exp.extra.should.have.property("type", TYPES.OBJECT);
                exp.extra.should.have.property("kind", TYPES.FLOAT3);

                var exp = parseAndInferenceExpression("this.coord.x");
                exp = exp[0];
                exp.should.have.property("extra");
                exp.extra.should.have.property("type", TYPES.NUMBER);
            });
    });

});

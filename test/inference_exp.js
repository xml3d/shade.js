var Shade = require(".."),
    expect = require('should'),
    TYPES = Shade.TYPES;


var parseAndInferenceExpression = function (str, ctx) {
    var aast = Shade.parseAndInferenceExpression(str, ctx || {});
    return aast.body[0];
}

describe('Inference', function () {
    describe('of Literals', function () {
        it("should annotate the type of an INT literal", function () {
            var exp = parseAndInferenceExpression("8");
            exp.should.have.property("result");
            exp.result.should.have.property("type", TYPES.INT);
        }),
            it("should annotate the type of a NUMBER literal", function () {
                var exp = parseAndInferenceExpression("7.0");
                exp.should.have.property("result");
                exp.result.should.have.property("type", TYPES.NUMBER);
            }),
            it("should annotate the type of a number literal", function () {
                var exp = parseAndInferenceExpression("7.2");
                exp.should.have.property("result");
                exp.result.should.have.property("type", TYPES.NUMBER);
            }),
            it("should annotate the type of a boolean literal", function () {
                var exp = parseAndInferenceExpression("true");
                exp.should.have.property("result");
                exp.result.should.have.property("type", TYPES.BOOLEAN);
            }),
            it("should annotate the type of a string literal", function () {
                var exp = parseAndInferenceExpression("'Hallo'");
                exp.should.have.property("result");
                exp.result.should.have.property("type", TYPES.STRING);
            }),
            it("should annotate the type of the 'undefined' literal", function () {
                var exp = parseAndInferenceExpression("undefined");
                exp.should.have.property("result");
                exp.result.should.have.property("type", TYPES.UNDEFINED);
            })

    });


    describe('of BinaryExpressions', function () {
        describe('with arithmetic operators', function () {
            it("should annotate int + int => int", function () {
                var exp = parseAndInferenceExpression("8 + 8");
                exp.should.have.property("result");
                exp.result.should.have.property("type", TYPES.INT);
            }),
                it("should annotate int + int => int", function () {
                    var exp = parseAndInferenceExpression("8 * 8");
                    exp.should.have.property("result");
                    exp.result.should.have.property("type", TYPES.INT);
                }),
                it("should annotate int / int => number", function () {
                    var exp = parseAndInferenceExpression("8 / 16");
                    exp.should.have.property("result");
                    exp.result.should.have.property("type", TYPES.NUMBER);
                }),
                it("should annotate number + int ⇒ number", function () {
                    var exp = parseAndInferenceExpression("8.4 + 8");
                    exp.should.have.property("result");
                    exp.result.should.have.property("type", TYPES.NUMBER);
                }),
                it("should annotate int + number ⇒ number", function () {
                    var exp = parseAndInferenceExpression("8 + 8.4");
                    exp.should.have.property("result");
                    exp.result.should.have.property("type", TYPES.NUMBER);
                }),
                it("should annotate number + number ⇒ number", function () {
                    var exp = parseAndInferenceExpression("8.2 + 8.4");
                    exp.should.have.property("result");
                    exp.result.should.have.property("type", TYPES.NUMBER);
                })
        }),
            describe('with comparision operators', function () {
                it("should annotate exp == exp ⇒ boolean", function () {
                    var exp = parseAndInferenceExpression("8.2 == 8.4");
                    exp.should.have.property("result");
                    exp.result.should.have.property("type", TYPES.BOOLEAN);
                });
                it("should annotate exp < exp ⇒ boolean", function () {
                    var exp = parseAndInferenceExpression("8.2 < 8.4");
                    exp.should.have.property("result");
                    exp.result.should.have.property("type", TYPES.BOOLEAN);
                });

            })
    });

    describe('LogicalExpressions', function () {
        it("should annotate T(a) == T(b) && T(b) != O: a && b ⇒ T(a)", function () {
            var exp = parseAndInferenceExpression("8.2 && 8.4");
            exp.should.have.property("result");
            exp.result.should.have.property("type", TYPES.NUMBER);
        });
        it("should annotate T(a) == undefined: a || b ⇒ T(b)", function () {
            var exp = parseAndInferenceExpression("undefined || 8");
            exp.should.have.property("result");
            exp.result.should.have.property("type", TYPES.INT);
        });
        it("should annotate T(a) == undefined: a && b ⇒ undefined", function () {
            var exp = parseAndInferenceExpression("undefined && true");
            exp.should.have.property("result");
            exp.result.should.have.property("type", TYPES.UNDEFINED);
        });
        it("should annotate T(a) == null: a && b ⇒ null", function () {
            var exp = parseAndInferenceExpression("null && true");
            exp.should.have.property("result");
            exp.result.should.have.property("type", TYPES.NULL);
        });
    });

    describe('ConditionalExpressions', function () {
        it("should annotate T(a) == T(b) && T(b) != O: c ? a : b ⇒ T(a)", function () {
            var exp = parseAndInferenceExpression("5 < 8 ? 4.5 : 3.5");
            exp.should.have.property("result");
            exp.result.should.have.property("type", TYPES.NUMBER);
        });
        it("should allow simple cast: T(a) == number, T(b) == int: c ? a : b ⇒ number", function () {
            var exp = parseAndInferenceExpression("5 < 8 ? 4.5 : 3");
            exp.should.have.property("result");
            exp.result.should.have.property("type", TYPES.NUMBER);
        });
        it("should annotate T(c) == undefined: c ? a : b ⇒ T(b)", function () {
            var exp = parseAndInferenceExpression("undefined ? null : 8");
            exp.should.have.property("result");
            exp.result.should.have.property("type", TYPES.INT);
        });
    });

    /*describe('with Parameters form outside', function () {
        var exp = parseAndInferenceExpression("a + 5", { a: { type: TYPES.INT }});
        exp.should.have.property("result");
        exp.result.should.have.property("type", TYPES.INT);
    });*/
})

var Shade = require(".."),
    expect = require('should'),
    parser = require('esprima'),
    inference = require("../src/analyze/typeinference/typeinference.js"),
    TYPES = Shade.TYPES;



var parseAndInferenceExpression = function (str) {
    var ast = parser.parse(str, {raw: true});
    var aast = inference.infer(ast);
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
        })
    });


    describe('of BinaryExpressions', function () {
        describe('of operator "+"', function () {
            it("should annotate int + int => int", function () {
                var exp = parseAndInferenceExpression("8 + 8");
                exp.should.have.property("result");
                exp.result.should.have.property("type", TYPES.INT);
            }),
            it("should annotate number + int ⇒ number", function () {
                var exp = parseAndInferenceExpression("8.4 + 8");
                exp.should.have.property("result");
            }),
            it("should annotate int + number ⇒ number", function () {
                var exp = parseAndInferenceExpression("8 + 8.4");
                exp.should.have.property("result");
            }),
            it("should annotate number + number ⇒ number", function () {
                var exp = parseAndInferenceExpression("8.2 + 8.4");
                exp.should.have.property("result");
            })
        })


    });


});

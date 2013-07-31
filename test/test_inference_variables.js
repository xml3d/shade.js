var Shade = require(".."),
    expect = require('should'),
    TYPES = Shade.TYPES,
    KINDS = Shade.OBJECT_KINDS;


var parseAndInferenceExpression = function (str, ctx) {
    var aast = Shade.parseAndInferenceExpression(str, ctx || {});
    return aast;
}

describe('Inference:', function () {
    describe('Variable initialization', function () {

        it("is annotated for no init expression", function () {
            var program = parseAndInferenceExpression("var a;");
            var declaration = program.body[0].declarations[0];
            declaration.should.have.property("extra");
            declaration.extra.should.have.property("type", TYPES.UNDEFINED);

            program.should.have.property("context").property("bindings").property("a");
            var a = program.context.bindings.a;
            a.should.have.property("initialized", false);
            a.should.have.property("type", TYPES.UNDEFINED);
        });

        it("is annotated for simple expression", function () {
            var program = parseAndInferenceExpression("var a = 5;");
            var declaration = program.body[0].declarations[0];
            declaration.should.have.property("extra");
            declaration.extra.should.have.property("type", TYPES.INT);
            declaration.extra.should.have.property("staticValue", 5);

            program.should.have.property("context").property("bindings").property("a");
            var a = program.context.bindings.a;
            a.should.have.property("initialized", true);
            a.should.have.property("type", TYPES.INT);
            a.should.have.property("staticValue", 5);

        });

        it("is annotated for expression", function () {
            var program = parseAndInferenceExpression("var a = 5.0 * (3 + 4);");
            var declaration = program.body[0].declarations[0];
            declaration.should.have.property("extra");
            declaration.extra.should.have.property("type", TYPES.NUMBER);
            declaration.extra.should.have.property("staticValue", 35);

            program.should.have.property("context").property("bindings").property("a");
            var a = program.context.bindings.a;
            a.should.have.property("initialized", true);
            a.should.have.property("type", TYPES.NUMBER);
            a.should.have.property("staticValue", 35);
        });

        it("is annotated for member expression", function () {
            var program = parseAndInferenceExpression("var a = Math.PI;");
            var exp = program.body[0].declarations[0].init;
            exp.extra.should.have.property("type", TYPES.NUMBER);
            exp.extra.should.have.property("staticValue", Math.PI);

            program.should.have.property("context").property("bindings").property("a");
            var a = program.context.bindings.a;
            a.should.have.property("initialized", true);
            a.should.have.property("type", TYPES.NUMBER);
            a.should.have.property("staticValue", Math.PI);
        });


        it("for multiple variables", function () {
            var program = parseAndInferenceExpression("var a = b = c = 5.0;");
            var declaration = program.body[0].declarations[0];
            declaration.should.have.property("extra");
            declaration.extra.should.have.property("type", TYPES.NUMBER);
            declaration.extra.should.have.property("staticValue", 5);

            program.should.have.property("context").property("bindings").property("a");
            var variable = program.context.bindings.a;
            variable.should.have.property("initialized", true);
            variable.should.have.property("type", TYPES.NUMBER);
            variable.should.have.property("staticValue", 5);
            program.should.have.property("context").property("bindings").property("b");
            variable = program.context.bindings.b;
            variable.should.have.property("initialized", true);
            variable.should.have.property("type", TYPES.NUMBER);
            variable.should.have.property("staticValue", 5);
            program.should.have.property("context").property("bindings").property("c");
            variable = program.context.bindings.c;
            variable.should.have.property("initialized", true);
            variable.should.have.property("type", TYPES.NUMBER);
            variable.should.have.property("staticValue", 5);
        });

        it("throws if already defined in same context", function () {
            var program = parseAndInferenceExpression.bind(null,"var a = 5.0; var a = 4.0;");
            program.should.throw();
        });

    });

    describe('Variable reassignment', function () {

        it("of same type is okay", function () {
            var program = parseAndInferenceExpression("var a = 5; a = 3;");
            var declaration = program.body[0].declarations[0];
            declaration.should.have.property("extra");
            declaration.extra.should.have.property("type", TYPES.INT);
            declaration.extra.should.have.property("staticValue", 5);

            var exp = program.body[1];
            exp.should.have.property("extra");
            exp.extra.should.have.property("type", TYPES.INT);
            exp.extra.should.have.property("staticValue", 3);

            program.should.have.property("context").property("bindings").property("a");
            var a = program.context.bindings.a;
            a.should.have.property("initialized", true);
            a.should.have.property("type", TYPES.INT);
            a.should.have.property("staticValue", 3);
        });

        it("of uninitialized variable is okay", function () {
            var program = parseAndInferenceExpression("var a; a = 3;");
            var declaration = program.body[0].declarations[0];
            declaration.should.have.property("extra");
            declaration.extra.should.have.property("type", TYPES.UNDEFINED);

            var exp = program.body[1];
            exp.should.have.property("extra");
            exp.extra.should.have.property("type", TYPES.INT);
            exp.extra.should.have.property("staticValue", 3);
        });

        it("with change of type throws", function () {
            var exp = parseAndInferenceExpression.bind(null, "var a = true; a = 3;");
            exp.should.throw();
        });


    });

    describe('Use variable in', function () {
        it("UnaryExpression", function () {
            var program = parseAndInferenceExpression("var a = 5; -a;");
            var exp = program.body[1].expression;
            exp.extra.should.have.property("type", TYPES.INT);
            exp.extra.should.have.property("staticValue", -5);
        });
        it("BinaryExpression", function () {
            var program = parseAndInferenceExpression("var a = 5; 2-a;");
            var exp = program.body[1].expression;
            exp.extra.should.have.property("type", TYPES.INT);
            exp.extra.should.have.property("staticValue", -3);
        });
        it("CallExpression", function () {
            var program = parseAndInferenceExpression("var a = Math.PI; Math.cos(a);");
            var init = program.body[0].declarations[0].init;
            init.extra.should.have.property("type", TYPES.NUMBER);
            init.extra.should.have.property("staticValue", Math.PI);

            program.should.have.property("context").property("bindings").property("a");
            var a = program.context.bindings.a;
            a.should.have.property("initialized", true);
            a.should.have.property("type", TYPES.NUMBER);
            a.should.have.property("staticValue", Math.PI);

            var exp = program.body[1].expression;
            exp.extra.should.have.property("type", TYPES.NUMBER);
            exp.extra.should.have.property("staticValue", -1);
        });

        it("ConditionalExpression", function () {
            var program = parseAndInferenceExpression("var test = true, cond = 2.0, alt = 1.0; test ? cond : alt");
            var init = program.body[0].declarations[0].init;
            init.extra.should.have.property("type", TYPES.BOOLEAN);
            init.extra.should.have.property("staticValue", true);

            program.should.have.property("context").property("bindings").property("cond");
            var cond = program.context.bindings.cond;
            cond.should.have.property("initialized", true);
            cond.should.have.property("type", TYPES.NUMBER);
            cond.should.have.property("staticValue", 2.0);

            var exp = program.body[1].expression;
            exp.extra.should.have.property("type", TYPES.NUMBER);
            exp.extra.should.have.property("staticValue", 2);
        });

    });


});

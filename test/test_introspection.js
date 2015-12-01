var Shade = require(".."),
    expect = require('should'),
    TYPES = Shade.TYPES,
    KINDS = Shade.OBJECT_KINDS;


var parseAndInferenceExpression = function (str, ctx) {
    var aast = Shade.parseAndInferenceExpression(str, ctx || {});
    return aast.body[0].expression;
};

var generateFunctionWithExecutionEnvironment = function(exp, params, thisParams) {
    params = params || {};
    var contextData = {
        "this": {
            "type": "object",
            "kind": "any",
            "info": thisParams || {}
        },
        "global.shade": [
            {
                "extra": {
                    "type": "object",
                    "kind": "any",
                    "global": true,
                    "info": params
                }
            }
        ]
    };
    var aast = Shade.parseAndInferenceExpression(exp, { inject: contextData, foldConstants: false });
    return aast.body[0].body;
}


xdescribe('Introspection:', function () {

    describe('typeof:', function () {
        it("typeof 'undefined'", function () {
            var exp = parseAndInferenceExpression("typeof undefined");
            exp.should.have.property("extra");
            exp.extra.should.have.property("type", TYPES.STRING);
            exp.extra.should.have.property("staticValue", 'undefined');
        });
        it("typeof undefined variable", function () {
            var exp = parseAndInferenceExpression.bind(null, "typeof b");
            exp.should.throw(/ReferenceError: b is not defined/);
        });
        it("typeof undefined parameter", function () {
          var func = generateFunctionWithExecutionEnvironment("function shade(env) { typeof env.a }");
          var exp = func.body[0].expression;
          exp.should.have.property("extra");
          exp.extra.should.have.property("type", TYPES.STRING);
          exp.extra.should.have.property("staticValue", TYPES.UNDEFINED);
        });
        it("typeof defined number parameter", function () {
          var func = generateFunctionWithExecutionEnvironment("function shade(env) { typeof env.myfloat }", { "myfloat": { "type": "number" }});
          var exp = func.body[0].expression;
          exp.should.have.property("extra");
          exp.extra.should.have.property("type", TYPES.STRING);
          exp.extra.should.have.property("staticValue", TYPES.NUMBER);
        });
        it("typeof defined object parameter", function () {
          var func = generateFunctionWithExecutionEnvironment("function shade(env) { typeof env.myvec2 }", { "myvec2": { "type": TYPES.OBJECT, kind: KINDS.FLOAT2 }});
          var exp = func.body[0].expression;
          exp.should.have.property("extra");
          exp.extra.should.have.property("type", TYPES.STRING);
          exp.extra.should.have.property("staticValue", TYPES.OBJECT);
        });

    });

    describe('instanceof:', function () {

    });


});

var parser = require('esprima'),
    inference = require("./typeinference.js"),
    TYPES = require("../../../").TYPES;

var parseAndInferenceExpression = function (str, envParams) {
    var ast = parser.parse(str, {raw: true});
    var aast = inference.infer(ast, envParams);
    return aast.body[0];
}

console.log(parseAndInferenceExpression("Math.xcos;", { a : { type: TYPES.INT }}));

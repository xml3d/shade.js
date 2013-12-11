(function (ns) {

    var Base = require("../../base/index.js");

    var Transformer = require("./transform.js").GLASTTransformer;
    var generate = require("./glsl-generate.js").generate;

    var GLSLCompiler = function () {

    };

    Base.extend(GLSLCompiler.prototype, {

        compileFragmentShader: function (aast, opt) {
            opt = opt || {};

            var transformer = new Transformer(aast, "global.shade", opt);

            //console.log(JSON.stringify(aast, 0, " "));

            var transformed = transformer.transform(aast, opt);

            //console.log(JSON.stringify(aast, 0, " "));

            opt.headers = transformed.headers;
            var code = generate(transformed.program, opt);

            return {source: code, uniformSetter: transformed.uniformSetter};
        }

    });


    ns.GLSLCompiler = GLSLCompiler;

}(exports));

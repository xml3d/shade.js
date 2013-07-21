(function (ns) {

    var Base = require("../../base/index.js").Base;
    var Transformer = require("./transform.js").GLASTTransformer;
    var generate = require("./generate.js").generate;

    var GLSLCompiler = function () {

    };

    Base.extend(GLSLCompiler.prototype, {

        compileFragmentShader: function (aast) {

            var transformer = new Transformer();
            var transformed = transformer.transformAAST(aast);

            var code = generate(transformed);

            return code;
        }

    });


    ns.GLSLCompiler = GLSLCompiler;

}(exports));

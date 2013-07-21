(function (ns) {

    var Base = require("../../base/index.js").Base;
    var Transformer = require("./transform.js").GLASTTransformer;
    var Generator = require("./generate.js").GLSLGenerator;

    var GLSLCompiler = function () {

    };

    Base.extend(GLSLCompiler.prototype, {

        compileFragmentShader: function (aast) {

            var transformer = new Transformer();
            var transformed = transformer.transformAAST(aast);

            var generator = new Generator();
            var code = generator.generateFragmentShader(transformed);

            return code;
        }

    });


    ns.GLSLCompiler = GLSLCompiler;

}(exports));
(function (ns) {

    var Base = require("../../base/index.js");

    var Transformer = require("./transform.js").EmbreeASTTransformer;
    var generate = require("./embree-generate.js").generate;

    var EmbreeCompiler = function () {

    };

    Base.extend(EmbreeCompiler.prototype, {

        compileShader: function (aast, opt) {

            var transformer = new Transformer("global.shade");

            //console.log(JSON.stringify(aast, 0, " "));

            var transformed = transformer.transformAAST(aast);

            //console.log(JSON.stringify(aast, 0, " "));

            var code = generate(transformed, opt);

            return code;
        }

    });


    ns.EmbreeCompiler = EmbreeCompiler;

}(exports));

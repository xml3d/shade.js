(function (ns) {

    var Base = require("../../base/index.js"),
        codegen = require("escodegen");

    var Simplifier = require("../simple-statement/simple-statement.js");
    var Transformer = require("./transform.js").GLMatrixTransformer;


    var GLMatrixCompiler = function () {

    };

    Base.extend(GLMatrixCompiler.prototype, {

        compile: function (aast, opt) {
            opt = opt || {};

            aast = Simplifier.simplifyStatements(aast, opt);

            aast = new Transformer().transform(aast);

            var code = codegen.generate(aast, opt);

            return code;
        }

    });


    ns.GLMatrixCompiler = GLMatrixCompiler;

}(exports));

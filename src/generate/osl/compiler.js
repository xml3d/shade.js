(function (ns) {

    var Base = require("../../base/index.js");

    var OSLTransformContext = require("./registry/").OSLTransformContext;
    var transform = require("./osl-transform.js").transform;
    var generate = require("./osl-generate.js").generate;

    var OSLCompiler = function (opt) {
        this.options = opt || {};
    };

    Base.extend(OSLCompiler.prototype, {

        compile: function (aast) {

            var context = new OSLTransformContext(aast, "global.shade", Base.extend(this.options, {
                blockedNames: ["N"]
            }));

            var transformed = transform(aast, context);

            var code = generate(transformed, context);

            return code;
        }

    });


    ns.compile = function(aast, opt) {
        var compiler = new OSLCompiler(opt);
        return compiler.compile(aast);
    };

}(exports));

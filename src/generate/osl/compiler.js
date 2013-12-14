(function (ns) {

    var Base = require("../../base/index.js");

    var transform = require("./osl-transform.js").transform;
    var generate = require("./osl-generate.js").generate;

    var OSLCompiler = function (opt) {
        this.options = opt || {};
    };

    Base.extend(OSLCompiler.prototype, {

        compile: function (aast) {

            var transformed = transform(aast, this.options);

            var code = generate(transformed, this.options);

            return code;
        }

    });


    ns.compile = function(aast, opt) {
        var compiler = new OSLCompiler(opt);
        return compiler.compile(aast);
    };

}(exports));

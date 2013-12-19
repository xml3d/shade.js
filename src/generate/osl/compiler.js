(function (ns) {

    var Base = require("../../base/index.js");

    var OSLTransformContext = require("./registry/").OSLTransformContext;
    var transform = require("./osl-transform.js").transform;
    var generate = require("./osl-generate.js").generate;

    var OSLKeywords = ["time", "color", "break", "closure", "color", "continue", "do", "else", "emit", "float", "for", "if", "illuminance",
                  "illuminate", "int", "matrix", "normal", "output", "point", "public", "return", "string", "struct", "vector", "void", "while"];

    var OSLGlobals = ["P", "I", "N", "Ng", "dPdu", "dPdv", "u", "v", "time", "dtime", "dPdtime", "Ci"];

    var OSLCompiler = function (opt) {
        this.options = opt || {};
    };

    Base.extend(OSLCompiler.prototype, {

        compile: function (aast) {

            var context = new OSLTransformContext(aast, "global.shade", Base.extend(this.options, {
                blockedNames: OSLKeywords.concat(OSLGlobals)
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

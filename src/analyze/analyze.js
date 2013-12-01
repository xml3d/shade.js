(function (ns) {

    var sanitizer = require("./sanitizer/sanitizer.js"),
        resolver =  require("../resolve/resolve.js"),
        validator = require("./validator.js"),
        inference = require("./typeinference/typeinference.js");

    /**
     *
     * @param {Object} ast
     * @param {Object|null} opt
     * @returns {Object}
     */
    var analyze = function (ast, opt) {
        opt = opt || {};

        var error;

        try {
            // Resolve BRDF closures
            ast = opt.implementation ? resolver.resolveClosures(ast, opt.implementation, opt) : ast;

            // Sanitize strange expressions into something
            // that is better analysable
            ast = opt.sanitize ? sanitizer.sanitize(ast, opt) : ast;

            ast = inference.infer(ast, opt);

            // Remove dead code and check for remaining code the completeness
            // of annotations
            ast = opt.validate ? validator.validate(ast) : ast;

        } catch (e) {
            if(opt.throwOnError) {
                throw e;
            }
            error = e;
        }

        return {
            ast: ast,
            error: error
        };

    };


    ns.analyze = analyze;

}(exports));

(function (ns) {

    var sanitizer = require("./sanitizer/sanitizer.js"),
        resolver =  require("../resolve/resolve.js"),
        staticTransformer = require("./constants/staticTransformer.js"),
        uniformAnalysis = require("./uniformExpressions/uniformAnalysis.js"),
        validator = require("./validator.js"),
        AnalysisContext = require("./analysiscontext.js"),
        inference = require("./typeinference/typeinference.js"),
        spaceTransformer = require("../generate/space/transform.js").SpaceTransformer,
        Annotations = require("./../base/annotation.js"),
        codegen = require("escodegen");



    var ANNO = Annotations.ANNO;

    /**
     *
     * @param {Object} ast
     * @param {Object|null} opt
     * @returns {Object}
     */
    var analyze = function (ast, processingData, opt) {
        opt = opt || {};
        processingData = processingData || {};

        var error;

        try {
            // Resolve BRDF closures
            ast = opt.implementation ? resolver.resolveClosuresPreTypeInference(ast, opt.implementation, processingData, opt) : ast;

            // Sanitize strange expressions into something
            // that is better analysable
            ast = opt.sanitize ? sanitizer.sanitize(ast, opt) : ast;

            //console.log("Analyze", codegen.generate(ast), ast.type, opt.sanitize);
            var context = new AnalysisContext(ast, function(ast, options) {
                    // Calculate types and static values
                    ast = inference.infer(ast, this, options);

            ast = opt.implementation ? resolver.resolveClosuresPostTypeInference(ast, opt.implementation, processingData, opt) : ast;

                    // Remove/Replace dead code and static expressions
                    ast = staticTransformer.transform(ast, options);

                    return ast;

            }, opt);

            context.analyse();
            if (opt.entry) {
                context.injectCall(opt.entry, (opt.inject &&  opt.inject[opt.entry]) || []);
            }
            ast = context.getResult();

            opt.transformSpaces && spaceTransformer.transformAast(ast, opt);

            ast = opt.extractUniformExpressions ? uniformAnalysis.extract(ast, opt) : ast;
            // check for remaining code the completeness of annotations
            ast = opt.validate ? validator.validate(ast) : ast;

            if(opt.transformSpaces)
                processingData.spaceInfo = spaceTransformer.transformAast(ast, opt);

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

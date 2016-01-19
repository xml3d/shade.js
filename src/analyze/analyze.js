(function (ns) {

    // Dependencies
    var sanitizer = require("./sanitizer/sanitizer.js"),
        resolver =  require("../resolve/resolve.js"),
        staticTransformer = require("./constants/staticTransformer.js"),
        uniformAnalysis = require("./uniformExpressions/uniformAnalysis.js"),
        validator = require("./validator.js"),
        semantics = require("./semantics/semantics.js"),
        AnalysisContext = require("./analysiscontext.js"),
        inference = require("./typeinference/typeinference.js"),
        spaceTransformer = require("../generate/space/transform.js").SpaceTransformer,
        Annotations = require("./../type-system/annotation.js"),
        codegen = require("escodegen");


    // Shortcuts
    var ANNO = Annotations.ANNO;

    /**
     * This is the main analysis
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

                    // Remove/Replace dead code and static expressions
                    ast = staticTransformer.transform(ast, options);

                    ast = opt.extractUniformExpressions ? uniformAnalysis.extract(ast, opt) : ast;
                    //console.log(opt.uniformExpressions);

                    ast = opt.semanticAnalysis ?  semantics(ast, opt) : ast;

                    return ast;

            }, opt);

            context.analyse();
            if (opt.entry) {
                context.injectCall(opt.entry, (opt.inject &&  opt.inject[opt.entry]) || []);
            }
            ast = context.getResult();


            ast = opt.implementation ? resolver.resolveClosuresPostTypeInference(ast, opt.implementation, processingData, opt) : ast;

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

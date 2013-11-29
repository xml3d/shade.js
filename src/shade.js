(function (ns) {
    var parser = require('esprima'),
        parameters = require("./analyze/parameters.js"),
        interfaces = require("./interfaces.js"),
        inference = require("./analyze/typeinference/typeinference.js"),
        sanitizer = require("./analyze/sanitizer/sanitizer.js"),
        Base = require("./base/index.js"),
        GLSLCompiler = require("./generate/glsl/compiler.js").GLSLCompiler,
        resolver = require("./resolve/resolve.js"),
        SpaceTransformer = require("./generate/space/transform.js").SpaceTransformer;
    var spaceAnalyzer = require("./analyze/space_analyzer.js"),
        SpaceVectorType = spaceAnalyzer.SpaceVectorType,
        SpaceType = spaceAnalyzer.SpaceType,
        VectorType = spaceAnalyzer.VectorType;




    Base.extend(ns, {

        /**
         * Analyze the given source and extract all used shader and system parameters
         *
         * @param {function|string} input The function of source code to analyze
         * @param opt Options
         * @returns {{shaderParameters: Array, systemParameters: Array}}
         */
        extractParameters: function (input, opt) {
            if (typeof input == 'function') {
                input = input.toString();
            }
            var ast = parser.parse(input);
            return parameters.extractParameters(ast, opt);
        },

        getSanitizedAst: function(str, opt){
            var ast = parser.parse(str, {raw: true, loc: opt.loc || false });
            return sanitizer.sanitize(ast, opt);
        },

        parseAndInferenceExpression: function (ast, opt) {
            opt = opt || {};
            opt.entry = opt.entry || "global.shade";

            if (typeof ast == 'string') {
                ast = parser.parse(ast, {raw: true, loc: opt.loc || false });
            }

            if (opt.implementation) {
                ast = this.resolveClosures(ast, opt.implementation, opt);
            }

            return inference.infer(ast, opt);
        },

        resolveClosures: function(ast, implementation, opt) {
            opt = opt || {};
            return resolver.resolveClosures(ast, implementation, opt);
        },

        resolveSpaces: function(aast, opt){
            opt = opt || {};
            return SpaceTransformer.transformAast(aast, opt);
        },

        compileFragmentShader: function(aast, opt){
            return new GLSLCompiler().compileFragmentShader(aast, opt);
        },

        TYPES : interfaces.TYPES,
        OBJECT_KINDS : interfaces.OBJECT_KINDS,
        SOURCES: interfaces.SOURCES,
        SPACE_VECTOR_TYPES: SpaceVectorType,
        Vec2: interfaces.Vec2,
        Vec3: interfaces.Vec3,
        Vec4: interfaces.Vec4,
        Texture: interfaces.Texture,
        Color: interfaces.Color,
        Mat3: interfaces.Mat3

});
    /**
     * Library version:
     */
    ns.version = '0.0.1';

}(exports));

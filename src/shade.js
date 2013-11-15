(function (ns) {
    var parser = require('esprima'),
        parameters = require("./analyze/parameters.js"),
        interfaces = require("./interfaces.js"),
        inference = require("./analyze/typeinference/typeinference2.js"),
        sanitizer = require("./analyze/sanitizer/sanitizer.js"),
        Base = require("./base/index.js"),
        GLSLCompiler = require("./generate/glsl/compiler.js").GLSLCompiler,
        resolver = require("./resolve/resolve.js");




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

        compileFragmentShader: function(aast, opt){
            return new GLSLCompiler().compileFragmentShader(aast, opt);
        },

        TYPES : interfaces.TYPES,
        OBJECT_KINDS : interfaces.OBJECT_KINDS,
        SOURCES: interfaces.SOURCES,
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

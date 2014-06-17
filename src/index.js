(function (ns) {
    var parser = require('esprima'),
        codegen = require('escodegen'),
        parameters = require("./analyze/parameters.js"),
        interfaces = require("./interfaces.js"),
        inference = require("./analyze/typeinference/typeinference.js"),
        sanitizer = require("./analyze/sanitizer/sanitizer.js"),
        Base = require("./base/index.js"),
        GLSLCompiler = require("./generate/glsl/compiler.js").GLSLCompiler,
        LightPassGenerator = require("./generate/light-pass/light-pass-generator.js"),
        resolver = require("./resolve/resolve.js"),
        SpaceTransformer = require("./generate/space/transform.js").SpaceTransformer,
        validator = require("./analyze/validator.js"),
        analyzer = require("./analyze/analyze.js"),
        SpaceVectorType = interfaces.SpaceVectorType,
        SpaceType = interfaces.SpaceType,
        VectorType = interfaces.VectorType;


    var WorkingSet = function(){
        this.ast = null;
        this.aast = null;
        this.result = null;
        this.processingData = {};
    };
    Base.extend(WorkingSet.prototype, {
        setAst: function(ast){
            this.ast = ast;
        },
        parse: function(code, opt){
            opt = opt || {};
            this.ast = ns.parse(code, opt);
        },
        analyze: function(inject, implementation, opt){
            opt = opt || {};
            opt.entry = opt.entry || "global.shade";
            opt.validate = opt.validate !== undefined ? opt.validate : true;
            opt.throwOnError = opt.throwOnError !== undefined ? opt.throwOnError : true;
            opt.implementation = implementation;
            opt.inject = inject;
            this.aast = analyzer.analyze(this.ast, this.processingData, opt).ast;
            return this.aast;
        },
        getProcessingData: function(key){
            return this.processingData[key];
        },
        compileFragmentShader: function(opt){
            this.result = ns.compileFragmentShader(this.aast, opt);
            return this.result;
        }
    });



    Base.extend(ns, {

        parse: function(ast, opt) {
            if (typeof ast == 'string') {
                return parser.parse(ast, {raw: true, loc: opt.loc || false });
            }
            return ast;
        },

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
            var ast = this.parse(str, opt);
            return sanitizer.sanitize(ast, opt);
        },

        parseAndInferenceExpression: function (ast, opt) {
            opt = opt || {};
            opt.entry = opt.entry || "global.shade";
            opt.validate = opt.validate !== undefined ? opt.validate : true;
            opt.throwOnError = opt.throwOnError !== undefined ? opt.throwOnError : true;

            ast = ns.parse(ast, opt);
            return analyzer.analyze(ast, {}, opt).ast;
        },

        analyze: function(ast, opt) {
            opt = opt || {};
            ast = ns.parse(ast, opt);

            return analyzer.analyze(ast, {}, opt)
        },

        resolveClosures: function(ast, implementation, processData, opt) {
            opt = opt || {};
            processData = processData || {};
            return resolver.resolveClosuresPreTypeInference(ast, implementation, processData, opt);
        },

        resolveSpaces: function(aast, opt){
            opt = opt || {};
            return SpaceTransformer.transformAast(aast, opt);
        },

        getLightPassAast: function(colorClosureSignatures, inject, opt){
            return LightPassGenerator.generateLightPassAast(colorClosureSignatures, inject)
        },

        compileFragmentShader: function(aast, opt){
            return new GLSLCompiler().compileFragmentShader(aast, opt);
        },

        toJavaScript: function(aast, opt){
            return codegen.generate(aast, opt);
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
        Mat3: interfaces.Mat3,
        Mat4: interfaces.Mat4,
        WorkingSet: WorkingSet

});
    /**
     * Library version:
     */
    ns.version = '0.0.1';

}(exports));

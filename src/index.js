(function (ns) {
    require('es6-map/implement');

    var parser = require('esprima'),
        codegen = require('escodegen'),
        parameters = require("./analyze/parameters.js"),
        interfaces = require("./interfaces.js"),
        inference = require("./analyze/typeinference/typeinference.js"),
        sanitizer = require("./analyze/sanitizer/sanitizer.js"),
        Base = require("./base/index.js"),
        GLSLCompiler = require("./generate/glsl/compiler.js").GLSLCompiler,
        GLMatrixCompiler = require("./generate/glmatrix/compiler.js").GLMatrixCompiler,
        LightPassGenerator = require("./generate/light-pass/light-pass-generator.js"),
        resolver = require("./resolve/resolve.js"),
        SpaceTransformer = require("./generate/space/transform.js").SpaceTransformer,
        validator = require("./analyze/validator.js"),
        analyzer = require("./analyze/analyze.js"),
        SpaceVectorType = interfaces.SpaceVectorType,
        SpaceType = interfaces.SpaceType,
        VectorType = interfaces.VectorType,
        SnippetList = require("./generate/snippets/snippet-list.js").SnippetList,
        SnippetEntry = require("./generate/snippets/snippet-list.js").SnippetEntry,
        SnippetConnector = require("./generate/snippets/snippet-connector"),
        TypeSystem = require("./type-system/type-system.js"),
        GlMatrix = require("./contrib/gl-matrix.js");


    require("./contrib/gl-matrix-extend.js").extend(GlMatrix);


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
            if (typeof ast == 'function') {
                ast = ast.toString();
            }
            if (typeof ast == 'string') {
                return parser.parse(ast, {raw: true, loc: opt.loc || false });
            }
            return ast;
        },

        /**
         * Analyze the given source and extract all used shader and system parameters
         *
         * @param {object} input The AST of the source code to analyze
         * @param opt Options
         * @returns {{shaderParameters: Array, systemParameters: Array}}
         */
        extractParameters: function (ast, opt) {
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
        getSnippetAst: function(code){
            var fullAst;
            if(typeof(code) == "function"){
                code = "METHOD=" + code.toString();
                fullAst = this.getSanitizedAst(code, {}).body[0].expression.right;
            }
            else{
                fullAst = this.getSanitizedAst(Base.deepExtend({}, code), {});
            }
            return fullAst;
        },

        getSystem: function() {
            return TypeSystem.getPredefinedObject("System");
        },

        compileJsProgram: function(snippetList, systemParams, defaultIteration){
            var result = SnippetConnector.connectSnippets(snippetList, {
                mode: defaultIteration ? SnippetConnector.MODE.JS_ITERATE : SnippetConnector.MODE.JS_NO_ITERATE});

            var aast = this.parseAndInferenceExpression(result.ast, {
                entry: "global.main",
                validate: true,
                inject: {
                    "this": systemParams,
                    "global.main": result.argTypes
                }
            });

            var compiled = new GLMatrixCompiler().compile(aast, {});
            return {
                code: compiled
            }
        },

        compileVertexShader: function(snippetList, systemParams){
            var result = SnippetConnector.connectSnippets(snippetList, { mode: SnippetConnector.MODE.GLSL_VS });

            var aast = this.parseAndInferenceExpression(result.ast, {
                entry: "global.main",
                validate: true,
                inject: {
                    "this": systemParams,
                    "global.main": result.argTypes
                }
            });

            var inputIndices = {};
            for(var inputName in result.inputIndices){
                inputIndices["_env_" + inputName] =  result.inputIndices[inputName];
            }

            var compiled = new GLSLCompiler().compileVertexShader(aast, {});
            return {
                code: compiled.source,
                inputIndices: inputIndices
            }
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
        WorkingSet: WorkingSet,
        SnippetList: SnippetList,
        SnippetEntry: SnippetEntry,
        Math: GlMatrix

});
    /**
     * Library version:
     */
    ns.version = '0.3.0';

}(exports));

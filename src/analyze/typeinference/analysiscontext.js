(function (ns) {

    var common = require("../../base/common.js");
    var Scope = require("../../base/scope.js");
    var walk = require('estraverse');
    var InferenceScope = require("./registry/").InferenceScope;
    var Annotations = require("./../../base/annotation.js");

    var Syntax = common.Syntax;
    var FunctionAnnotation = Annotations.FunctionAnnotation;

    /**
     *
     * @param ast
     * @param {Function} analysis
     * @param {*} opt
     * @constructor
     */
    var AnalysisContext = function (ast, analysis, opt) {
        opt = opt || {};

        /**
         * Callback that continues analysis in the same context
         * @see {AnalysisContext.analyze}
         * @type {Function}
         */
        this.analysis = analysis;

        /**
         * @type {Array.<Scope>}
         */
        this.scopeStack = opt.scope ? [opt.scope] : [ new Scope(ast) ];

        /**
         * Map of (global) function name to untyped functions that
         * serve as a template for calls that might come with
         * different signatures
         * @type {Map}
         */
        this.availableFunctions = this.extractAllFunctions(ast);

        /**
         * Cache of functions that types has already been derived.
         * Maps from signature to annotated ast
         * @type {Map}
         */
        this.derivedFunctions = new Map();

        // We monitor if we are in a declaration, otherwise we can't decide between
        // multiple declaration
        var inDeclaration = false;
        this.inDeclaration = function() {
            return inDeclaration;
        };

        this.setInDeclaration = function(v) {
            inDeclaration = v;
        }


    };

    AnalysisContext.prototype = {
        getTypeInfo: function (node) {
            return common.getTypeInfo(node, this.getScope());
        },
        analyze: function (node) {
            if (this.analysis) {
                this.analysis.apply(this, arguments);
            }
        },
        getScope: function () {
            return this.scopeStack[this.scopeStack.length - 1];
        },
        pushScope: function (scope) {
            return this.scopeStack.push(scope);
        },
        popScope: function () {
            return this.scopeStack.pop();
        },
        getFunctionInformationFor: function(name, args, definingContext) {
            var signature = this.createSignatureFromNameAndArguments(name, args);
            var info = this.getFunctionInformationBySignature(signature);
            if (info)
                return info;

            return this.createFunctionInformationFor(name, args, definingContext);
        },
        createSignatureFromNameAndArguments: function(name, args) {
            return args.reduce(function(str, arg) { return str + arg.getTypeString()}, name);
        },
        getFunctionInformationBySignature: function(signature) {
            if (this.derivedFunctions.has(signature)) {
                var derivedFunction = this.derivedFunctions.get(signature);
                return derivedFunction.info;
            }
            return null;
        },
        createFunctionInformationFor: function(name, args, definingContext) {
            if (this.availableFunctions.has(name)) {
                var ast = this.availableFunctions.get(name);

                var derived = {};
                derived.ast = this.inferFunction(JSON.parse(JSON.stringify(ast)), args, definingContext);
                derived.info = derived.ast.extra.returnInfo;
                derived.info.newName = name.replace(/\./g, '_') + this.derivedFunctions.size;
                derived.ast.id.name = derived.info.newName;
                //derived.order = this.getCallNumber();
                this.derivedFunctions.set(this.createSignatureFromNameAndArguments(name, args), derived);
                return derived.info;
            }
            throw new Error("Could not resolve function " + name);
        },
        /**
         *
         * @param prg
         * @returns {Map}
         */
        extractAllFunctions : function (prg) {
            var result = new Map();

            result.set("global", prg);
            var context = this;

            walk.replace(prg, {
                enter: function (node) {
                    if (node.type == Syntax.FunctionDeclaration) {
                        var localName = node.id.name;
                        var parentScope = context.getScope();
                        var anno = new FunctionAnnotation(node);
                        parentScope.declareVariable(localName);
                        parentScope.updateTypeInfo(localName, anno);

                        var newScope = new InferenceScope(node, parentScope, {name: localName });
                        result.set(newScope.str(), node);
                        context.pushScope(newScope);
                    }
                },
                leave: function (node) {
                    var result;
                    if (node.type == Syntax.FunctionDeclaration) {
                        context.popScope();
                        result = { type: Syntax.EmptyStatement };
                    }
                    return result;
                }
            });
            prg.body = prg.body.filter(function (a) {
                return a.type != Syntax.EmptyStatement;
            });
            return result;
        }

    };

    // TODO: remove
    AnalysisContext.prototype.traverse = AnalysisContext.prototype.analyze;

    ns.AnalysisContext = AnalysisContext;

}(exports));

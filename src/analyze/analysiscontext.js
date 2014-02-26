(function(module){

    // Dependencies
    var Context = require("../base/context.js");
    var common = require("../base/common.js");
    var Base = require("../base/index.js");
    var Annotations = require("./../base/annotation.js");
    var assert = require('assert');
    var walk = require('estraverse');
    var InferenceScope = require("./typeinference/registry/").InferenceScope;
    var System = require("./typeinference/registry/system.js");
    var Shade = require("../interfaces.js");
        var codegen = require("escodegen");


    // Shortcuts
    var Map = common.Map,
        Syntax = common.Syntax,
        FunctionAnnotation = Annotations.FunctionAnnotation,
        ANNO = Annotations.ANNO;

    /**
     *
     * @param {*} program
     * @param {function} analysis
     * @param {*} options
     * @extends {Context}
     * @constructor
     */
    var AnalysisContext = function(program, analysis, options) {
        Context.call(this, program, options);

        assert.equal(program.type, Syntax.Program);

        /**
         * Callback that continues analysis in the same context
         * @see {AnalysisContext.analyze}
         * @type {Function}
         */
        this.analysis = analysis;

        this.root.globalParameters = {};


        var scope = createGlobalScope(program);
        registerSystemInformation(scope, options);
        this.pushScope(scope);

        /**
         * Map of (global) function name to untyped functions that
         * serve as a template for calls that might come with
         * different signatures
         * @type {Map}
         */
        this.functionMap = extractAllFunctions(program, this);


        /**
         * Cache of functions that types has already been derived.
         * Maps from signature to annotated ast
         * @type {Object}
         */
        this.derivedFunctions = {};

        this.constants = null;
    };

    Base.createClass(AnalysisContext, Context, {
        analyse: function() {
            return this.analysis.call(this, this.root, this.options);
        },
        getTypeInfo: function (node) {
            return common.getTypeInfo(node, this.getScope(), this.constants, true);
        },
        /**
         *
         * @param {null|Set}
         */
        setConstants: function(c) {
            this.constants = c;
        },
        callFunction: function (name, args, opt) {
            var signature = this.createSignatureFromNameAndArguments(name, args);
            var info = this.getFunctionInformationBySignature(signature);
            if (info)
                return info;

            return this.createFunctionInformationFor(name, args, opt);
        },
        createSignatureFromNameAndArguments: function (name, args) {
            return args.reduce(function (str, arg) {
                return str + arg.getTypeString()
            }, name);
        },
        getFunctionInformationBySignature: function (signature) {
            if (this.derivedFunctions.hasOwnProperty(signature)) {
                var derivedFunction = this.derivedFunctions[signature];
                //console.log("Reuse", signature);
                return derivedFunction.info;
            }
            return null;
        },
        createFunctionInformationFor: function (name, args, opt) {
            var ast, derived, globalName;
            opt = opt || {};

            if (this.functionMap.has(name)) {
                ast = this.functionMap.get(name);
                globalName = opt.name || this.getSafeUniqueName(name.replace(/\./g, '_'));
                derived = {};
                derived.ast = this.analyseFunction(JSON.parse(JSON.stringify(ast)), args);
                derived.info = derived.ast.extra.returnInfo;
                derived.info.newName = derived.ast.id.name = globalName;
                this.derivedFunctions[this.createSignatureFromNameAndArguments(name, args)] = derived;
                return derived.info;
            }
            throw new Error("Could not resolve function " + name);
        },
        analyseFunction: function(funcDecl, params) {
            var functionScope = new InferenceScope(funcDecl, this.getScope(), {name: funcDecl.id.name });
            var functionAnnotation = new FunctionAnnotation(funcDecl);

            //console.error("analyseFunction:", functionScope.str());

            setParameterTypes(funcDecl.params, params);
            functionScope.declareParameters(funcDecl.params);

            this.pushScope(functionScope);
            funcDecl.body = this.analysis.call(this, funcDecl.body, this.options);

            // Annotate Function Return type from Scope
            functionAnnotation.setReturnInfo(functionScope.getReturnInfo());
            this.popScope();
            return funcDecl;
        },
        getResult: function() {
            // (Re-)add derived function to the program
            addDerivedMethods(this.root, this);
            return this.root;
        },
        declareVariables: function (ast, inDeclaration) {
            var scope = this.getScope(), context = this;
            if (ast.type == Syntax.VariableDeclaration) {
                var declarations = ast.declarations;
                declarations.forEach(function (declaration) {
                    var result = ANNO(declaration);

                    if (declaration.id.type != Syntax.Identifier) {
                        throw new Error("Dynamic variable names are not yet supported");
                    }
                    var variableName = declaration.id.name;
                    scope.declareVariable(variableName, true, result);

                    if (declaration.init) {
                        var init = ANNO(declaration.init);
                        scope.updateTypeInfo(variableName, init, declaration);
                        if (declaration.init.type == Syntax.AssignmentExpression) {
                            context.declareVariables(declaration.init, true);
                        }
                    } else {
                        result.setType(Shade.TYPES.UNDEFINED);
                    }
                })
            } else if (ast.type == Syntax.AssignmentExpression && inDeclaration) {
                var typeInfo = ANNO(ast.right);

                if (ast.left.type != Syntax.Identifier) {
                    throw new Error("Dynamic variable names are not yet supported");
                }
                var variableName = ast.left.name;
                scope.declareVariable(variableName, true, ANNO(ast));
                scope.updateTypeInfo(variableName, typeInfo, ast);
                if (ast.right.type == Syntax.AssignmentExpression) {
                    context.declareVariables(ast.right, true);
                }
            }
            return true;
        },
        injectCall: function(name, entryParams) {

                if (!this.functionMap.has(name))
                    return;

                // First parameter is set as global _env object to be accessible form BRDFs
                // This is a big hack, need better injection mechanism
                var envObject = entryParams[0];
                if (envObject && envObject.extra) {
                    var envAnnotation = new Annotations.Annotation({}, envObject.extra);
                    this.getScope().updateTypeInfo("_env", envAnnotation);
                }

                this.root.globalParameters[name] = entryParams;
                this.callFunction(name, entryParams.map(function (param) {
                    return ANNO(param);
                }), { name: "shade"});

        }

    });


    /**
     *
     * @param prg
     * @param {AnalysisContext} context
     * @returns {Map}
     */
    function extractAllFunctions(prg, context) {
        var result = new Map();

        result.set("global", prg);

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
                var replace;
                if (node.type == Syntax.FunctionDeclaration) {
                    context.popScope();
                    replace = { type: Syntax.EmptyStatement };
                }
                return replace;
            }
        });
        prg.body = prg.body.filter(function (a) {
            return a.type != Syntax.EmptyStatement;
        });
        return result;
    };


    function addDerivedMethods(program, context) {
        for(var func in context.derivedFunctions) {
            program.body.push(context.derivedFunctions[func].ast);
        }

        walk.traverse(program, {
            enter: function(node) {
                if(node.type == Syntax.CallExpression) {
                    if(node.extra && node.extra.newName) {
                        node.callee.name = node.extra.newName;
                    };
                }
            }
        });
    }

    /**
     *
     * @param {Array.<Object>} params
     * @param {Array.<Object>} types
     */
    function setParameterTypes(params, types) {
        for (var i = 0; i < params.length; i++) {
            var funcParam = ANNO(params[i]);
            if (i < types.length) {
                funcParam.setFromExtra(types[i].getExtra());
                funcParam.setDynamicValue();
            } else {
                funcParam.setType(Shade.TYPES.UNDEFINED);
            }
        }
    }

    function createGlobalScope(ast) {
        var globalScope = new InferenceScope(ast, null, {name: "global"});
        globalScope.registerGlobals();
        return globalScope;
    };

    function registerSystemInformation(scope, opt) {
        var thisInfo = (opt.inject && opt.inject.this) || null;
        scope.declareVariable("this");
        scope.updateTypeInfo("this", System.getThisTypeInfo(thisInfo));
    }

    module.exports = AnalysisContext;


}(module));

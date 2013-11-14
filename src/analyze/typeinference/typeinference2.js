(function (ns) {

    // dependencies
    var assert = require('assert');
    var esgraph = require('esgraph');
    var worklist = require('analyses');
    var common = require("../../base/common.js");
    var codegen = require('escodegen');
    var AnalysisContext = require("../analysiscontext.js").AnalysisContext;
    var annotateRight = require("./infer_expression.js").annotateRight;
    var InferenceScope = require("./registry/").InferenceScope;
    var walk = require('estraverse');
    var Annotations = require("./../../base/annotation.js");

    // shortcuts
    var Syntax = common.Syntax;
    //var Set = worklist.Set;
    var FunctionAnnotation = Annotations.FunctionAnnotation;
    var ANNO = Annotations.ANNO;


    function createGlobalScope(ast) {
        var globalScope = new InferenceScope(ast, null, {name: "global"});
        globalScope.registerGlobals();
        return globalScope;
    }

    /**
     * @param {*} ast
     * @param {*} opt
     * @returns {*}
     */
    function inferProgram(ast, opt) {
        opt = opt || {};
        var globalScope = createGlobalScope(ast);
        var context = new AnalysisContext(ast, annotateRight, { scope: globalScope });

        var functionMap = extractAllFunctions(ast, context);

        ast = inferBody(ast, context);

        var entry = opt.entry;
        if (entry) {
            if (!functionMap.has(entry)) {
                throw new Error("Could not find entry point: " + entry);
            }
            console.error(entry);
            var entryNode = functionMap.get(entry);
            var functionAST = inferFunction(entryNode, context, []);
            ast.body.push(functionAST);
        }

        return ast;
    }

    function inferFunction(ast, context, params) {
        var functionScope = new InferenceScope(ast, context.getScope(), {name: ast.id.name });
        console.log("inferFunction", functionScope.str());

        setParameterTypes(ast.params, params);

        context.pushScope(functionScope);
        var result = inferBody(ast, context);
        context.popScope();
        return result;
    }


    function inferBody(ast, context) {

        var cfg = esgraph(ast.body, { omitExceptions: true });
        worklist(cfg,
            /**
             * @param {Set} input
             * @this {FlowNode}
             * @returns {*}
             */
             function (input) {
                console.log("IN")
                if (!this.astNode || this.type) // Start and end node do not influence the result
                    return input;
                console.log("AFTER")

                // Local
                if (!this.analyzed) {
                    console.log("Analyze", codegen.generate(this.astNode), this.astNode.type);
                    context.analyze(this.astNode);
                    this.analyzed = true;
                }
                return input;
            }
            , {
                direction: 'forward'
            });
        return ast;
    }

    /**
     *
     * @param prg
     * @param {AnalysisContext} context
     * @returns {Map}
     */
    var extractAllFunctions = function (prg, context) {
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
    };

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
            }
        }
    }


    ns.infer = inferProgram;

}(exports));

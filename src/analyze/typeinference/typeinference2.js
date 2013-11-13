(function (ns) {

    // dependencies
    var assert = require('assert');
    var esgraph = require('esgraph');
    var worklist = require('analyses');
    var common = require("../../base/common.js");
    // var codegen = require('escodegen');
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



    /**
     * @param {*} ast
     * @param {*} opt
     * @returns {*}
     */
    function inferProgram(ast, opt) {
        opt = opt || {};


        var globalScope = new InferenceScope(ast, null, {name: "global"});
        globalScope.registerGlobals();

        var functionMap = extractFunctions(ast, globalScope);

        var context = new AnalysisContext(ast, annotateRight, { scope: globalScope });

        ast = inferBody(ast, context);

        var entry = opt.entry;
        if (entry) {
            if (!functionMap.has(entry)) {
                throw new Error("Could not find entry point: " + entry);
            }
            console.error(entry);
            var entryNode = functionMap.get(entry);
            var functionAST = inferFunction(entryNode, context);
            ast.body.push(functionAST);
        }

        return ast;
    }

    function inferFunction(ast, context, params) {
        var functionScope = new InferenceScope(ast, context.getScope(), {name: ast.id.name });

        setParameterTypes(ast.params, params);

        context.pushScope(functionScope);
        var result = inferBody(ast, context);
        context.popScope();
        return result;
    }


    function inferBody(ast, context) {

        var cfg = esgraph(ast, { omitExceptions: true });
        worklist(cfg,
            /**
             * @param {Set} input
             * @this {FlowNode}
             * @returns {*}
             */
                function (input) {
                if (!this.astNode || this.type) // Start and end node do not influence the result
                    return input;

                // Local
                if (!this.analyzed) {
                    //console.log("Analyze", codegen.generate(this.astNode), this.astNode.type);
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

    var extractFunctions = function (prg, scope) {
        var result = new Map();
        var context = [];

        result.set("global", prg);
        context.push("global");

        walk.replace(prg, {
            enter: function (node) {
                if (node.type == Syntax.FunctionDeclaration) {
                    var anno = new FunctionAnnotation(node);
                    var localName = node.id.name;
                    scope.declareVariable(localName);
                    scope.updateTypeInfo(localName, anno);

                    var parentName = context[context.length - 1];
                    var globalName = parentName + "." + localName;
                    result.set(globalName, node);
                    context.push(globalName);
                }
            },
            leave: function (node) {
                var result;
                if (node.type == Syntax.FunctionDeclaration) {
                    context.pop();
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

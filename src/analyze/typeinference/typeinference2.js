(function (ns) {

    // dependencies
    var esgraph = require('esgraph');
    var worklist = require('analyses');
    var common = require("../../base/common.js");
    // var codegen = require('escodegen');
    var AnalysisContext = require("../analysiscontext.js").AnalysisContext;
    var annotateRight = require("./infer_expression.js").annotateRight;
    var InferenceScope = require("./registry/").InferenceScope;
    var walk = require('estraverse');
    var FunctionAnnotation = require("./../../base/annotation.js").FunctionAnnotation;

    // shortcuts
    var Syntax = common.Syntax;
    var Set = worklist.Set;

    /**
     * @param {*} ast
     * @param {*} opt
     * @returns {*}
     */
    function inferProgram(ast, opt) {
        opt = opt || {};

        var globalScope = new InferenceScope(ast, null, {name: "global"});
        globalScope.registerGlobals();

        var functionMap = buildFunctionMap(ast, globalScope);

        var context = new AnalysisContext(ast, annotateRight, { scope: globalScope });

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

        var entry = opt.entry;
        if (entry) {
            if (!functionMap.has(entry)) {
                throw new Error("Could not find entry point: " + entry);
            }
            var entryNode = functionMap.get(entry);
            var functionAST = inferFunction(entryNode, context);
            ast.body.push(entryNode);
        }

        return ast;
    }

    function inferFunction(ast, opt) {
        return ast;
    }


    var buildFunctionMap = function (prg, scope) {
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

    ns.infer = inferProgram;

}(exports));

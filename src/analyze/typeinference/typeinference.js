(function (ns) {

    // dependencies
    var assert = require('assert');
    var esgraph = require('esgraph');
    var worklist = require('analyses');
    var common = require("../../base/common.js");
    var Context = require("../../base/context.js");
    var Base = require("../../base/index.js");
    var codegen = require('escodegen');
    var annotateRight = require("./infer_expression.js").annotateRight;
    var InferenceScope = require("./registry/").InferenceScope;
    var System = require("./registry/system.js");
    var Annotations = require("./../../type-system/annotation.js");
    var walk = require('estraverse');
    var Tools = require("../settools.js");
    var Shade = require("../../interfaces.js");
    var walkes = require('walkes');
    var validator = require('../validator');
    var TypeInfo = require("../../type-system/typeinfo.js").TypeInfo;

    // shortcuts
    var Syntax = common.Syntax;
    var Set = worklist.Set;
    var FunctionAnnotation = Annotations.FunctionAnnotation;
    var ANNO = Annotations.ANNO;








    function findConstantsFor(ast, names, constantVariables) {
        var result = new Set(), annotation, name, formerValue;
        constantVariables = constantVariables ? constantVariables.values() : [];

        walkes(ast, {
            AssignmentExpression: function(recurse) {


                if (this.left.type != Syntax.Identifier) {
                    Shade.throwError(ast, "Can't find constant for computed left expression");
                }
                name = this.left.name;
                if(names.has(name)) {
                    annotation = ANNO(this.right);
                    if(annotation.hasStaticValue()) {
                        switch(this.operator) {
                            case "=":
                                result.add({ name: name, constant: TypeInfo.copyStaticValue(annotation)});
                                break;
                            case "-=":
                            case "+=":
                            case "*=":
                            case "/=":
                                formerValue = constantVariables.filter(function(v){ return v.name == name; });
                                if(formerValue.length) {
                                    var c = formerValue[0].constant, v;
                                    switch(this.operator) {
                                        case "+=":
                                            v = c + TypeInfo.copyStaticValue(annotation);
                                            break;
                                        case "-=":
                                            v = c - TypeInfo.copyStaticValue(annotation);
                                            break;
                                        case "*=":
                                            v = c * TypeInfo.copyStaticValue(annotation);
                                            break;
                                        case "/=":
                                            v = c / TypeInfo.copyStaticValue(annotation);
                                            break;
                                    }
                                    result.add({ name: name, constant: v});
                                }
                                break;
                            default:
                                assert(!this.operator);
                        }

                    }
                }
                recurse(this.right);
            },

            VariableDeclarator: function(recurse) {
                name = this.id.name;
                if (this.init && names.has(name)) {
                    annotation = ANNO(this.init);
                    if(annotation.hasStaticValue()) {
                        result.add({ name: name, constant: TypeInfo.copyStaticValue(annotation)});
                    }
                }
                recurse(this.init);
            },

            UpdateExpression: function(recurse) {
                if(this.argument.type == Syntax.Identifier) {
                    name = this.argument.name;
                    annotation = ANNO(this);
                    if(annotation.hasStaticValue()) {
                        var value = TypeInfo.copyStaticValue(annotation);
                        if (!this.prefix) {
                            value = this.operator == "--" ? --value : ++value;
                        }
                        result.add({ name: name, constant: value});
                    }
                }
            }
        });

        return result;
    }



    /**
     *
     * @param ast
     * @param {AnalysisContext} context
     * @param {*} opt
     * @constructor
     */
    var TypeInference = function (ast, context, opt) {
        opt = opt || {};

        this.context = context;

        this.propagateConstants = opt.propagateConstants || false;
    };

    Base.extend(TypeInference.prototype, {

        /**
         * @param {*} ast
         * @param {*} opt
         * @returns {*}
         */
        inferBody: function (ast, opt) {
             var cfg = esgraph(ast, { omitExceptions: true }),
                 context = this.context,
                 propagateConstants = this.propagateConstants;

        //console.log("infer body", cfg)

        var result = worklist(cfg,
            /**
             * @param {Set} input
             * @this {FlowNode}
             * @returns {*}
             */
                function (input) {

                if (!this.astNode || this.type) // Start and end node do not influence the result
                    return input;

                //console.log("Analyze", codegen.generate(this.astNode), this.astNode.type);

                // Local
                if(propagateConstants) {
                    this.kill = this.kill || Tools.findVariableAssignments(this.astNode, true);
                }

                annotateRight(context, this.astNode, propagateConstants ? input : null );

                this.decl = this.decl || context.declareVariables(this.astNode);

                //context.computeConstants(this.astNode, input);

                if(!propagateConstants) {
                    return input;
                }



                var filteredInput = null, generate = null;
                if (this.kill.size) {
                    // Only if there's an assignment, we need to generate
                    generate = findConstantsFor(this.astNode, this.kill, propagateConstants ? input : null);
                    var that = this;
                    filteredInput = new Set(input.filter(function (elem) {
                            return !that.kill.some(function(tokill) { return elem.name == tokill });
                    }));
                }

                var result = Set.union(filteredInput || input, generate);
//                console.log("input:", input);
//                console.log("kill:", this.kill);
//                console.log("generate:", generate);
//                console.log("filteredInput:", filteredInput);
//                console.log("result:", result);
                return result;
            }
            , {
                direction: 'forward',
                merge: worklist.merge(function(a,b) {
                    if (!a && !b)
                        return null;
                    //console.log("Merge", a && a.values(), b && b.values())
                    var result = Set.intersect(a, b);
                    //console.log("Result", result && result.values())
                    return result;
                })
            });
        //Tools.printMap(result, cfg);
        return ast;
        }

    });




    /**
     *
     * @param ast
     * @param {AnalysisContext} context
     * @param opt
     * @returns {*}
     */
    var inferProgram = function (ast, context, opt) {
        opt = opt || {};
        //var globalScope = createGlobalScope(ast);
        //registerSystemInformation(globalScope, opt);

        var typeInference = new TypeInference(ast, context, opt);
        var result = typeInference.inferBody(ast, opt);


        return result;
    };

    ns.infer = inferProgram;

}(exports));

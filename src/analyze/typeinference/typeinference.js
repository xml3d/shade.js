(function (ns) {
    /**
     * Shade.js specific type inference that is also inferring
     * virtual types {@link Shade.TYPES }
     */

    var walk = require('estraverse'),
        enterExpression = require('./infer_expression.js').enterExpression,
        exitExpression = require('./infer_expression.js').exitExpression,
        enterStatement = require('./infer_statement.js').enterStatement,
        exitStatement = require('./infer_statement.js').exitStatement,
        assert = require("assert"),

        ObjectRegistry = require("./registry/index.js").Registry,
        Scope = require("./../../base/scope.js").getScope(ObjectRegistry),
        Base = require("../../base/index.js"),
        Shade = require("../../interfaces.js"),
        Annotation = require("./../../base/annotation.js").Annotation,
        common = require("./../../base/common.js"),
        FunctionAnnotation = require("./../../base/annotation.js").FunctionAnnotation;



    var Syntax = walk.Syntax;


    var registerGlobalContext = function (program) {
        var ctx = new Scope(program, null, {name: "global"});
        ctx.registerObject("Math", ObjectRegistry.getByName("Math"));
        ctx.registerObject("Color", ObjectRegistry.getByName("Color"));
        ctx.registerObject("Vec2", ObjectRegistry.getByName("Vec2"));
        ctx.registerObject("Vec3", ObjectRegistry.getByName("Vec3"));
        ctx.registerObject("Vec4", ObjectRegistry.getByName("Vec4"));
        ctx.registerObject("Texture", ObjectRegistry.getByName("Texture"));
        ctx.registerObject("Shade", ObjectRegistry.getByName("Shade"));
        //ctx.registerObject("this", ObjectRegistry.getByName("System"));
        ctx.registerObject("Mat3", ObjectRegistry.getByName("Mat3"));
        ctx.registerObject("Mat4", ObjectRegistry.getByName("Mat4"));
        ctx.declareVariable("this");
        ctx.declareVariable("_env");
        return ctx;
    };

    var addDerivedParameters = function(propertyInfo) {
        var system = ObjectRegistry.getByName("System");
        for(var name in system.optionalMethods) {
            if(propertyInfo.hasOwnProperty(name)) {
                var method = propertyInfo[name];
                if (method.type == Shade.TYPES.FUNCTION) {
                    propertyInfo[name] = system.optionalMethods[name];
                }
            }
        }
        Base.extend(propertyInfo, system.derivedParameters);

    };

    var registerGlobalObjects = function(context, thisObject, envObject) {
        if(thisObject) {
            var thisAnnotation = new Annotation({}, thisObject);
            addDerivedParameters(thisAnnotation.getNodeInfo());
            context.updateTypeInfo("this", thisAnnotation);
        }
        if (envObject) {
            var envAnnotation = new Annotation({}, envObject);
            context.updateTypeInfo("_env", envAnnotation);
        }
    };

    var getFirstParameterOfEntryFunction = function(parameter, entryPoint) {
        if (!entryPoint || !parameter[entryPoint])
            return null;
        var entryPointParameters = parameter[entryPoint];
        if (!Array.isArray(entryPointParameters) || !entryPointParameters.length)
            return null;
        return entryPointParameters[0].extra || null;
    };

    var TypeInference = function (root, opt) {
        opt = opt || {};

        /**
         * The root of the program AST
         * @type {*}
         */
        this.root = root;

        /**
         * The context stack
         * @type {Array}
         */
        this.context = [];

        /** @type {string} **/
        this.entryPoint = opt.entry || "global.shade";

        /**
         * Struct that stores the ASTs of functions in the
         * original state and annotated for a specific signature
         * @type {{orig: {}, derived: {}}}
         */
        this.functions = {
            orig: {},
            derived: {}
        }
        this.root.globalParameters = {};

        var callNumber = 0;
        this.getCallNumber = function() {
            return callNumber++;
        }

    };

    Base.extend(TypeInference.prototype, {
        pushContext: function (context) {
            this.context.push(context);
            this.currentScope = context;
        },
        popContext: function () {
            this.context.pop();
            this.currentScope = this.peekContext();
        },
        peekContext: function () {
            return this.context[this.context.length - 1];
        },
        createContext: function (node, parentContext, name) {
           var result = new Scope(node, parentContext, {name: name } );
           return result;
        },

        /**
         * Get the TypeInfo for a node. Creates an empty one, if no
         * TypeInfo is available
         *
         * @param node
         * @returns {TypeInfo}
         */
        getTypeInfo: function(node) {
            return common.getTypeInfo(node, this.currentScope);
        },

        annotateParameters: function(arr) {
            return arr ? arr.map(function(param) {
                var annotated =  new Annotation(param);
                return annotated;
            }) : [];
        },


        buildFunctionMap: function(prg) {
            var that = this;
            walk.replace(prg, {
                enter: function(node) {
                    if (node.type == Syntax.FunctionDeclaration) {
                        var result = new FunctionAnnotation(node);
                        var functionName = node.id.name;
                        var parentContext = that.peekContext();
                        var functionContext = that.createContext(node, parentContext, functionName);
                        functionContext.declareParameters(node.params);
                        parentContext.declareVariable(functionName);
                        parentContext.updateTypeInfo(functionName, result);
                        that.pushContext(functionContext);
                        that.functions.orig[functionContext.str()] = node;
                    }
                },
                leave: function(node) {
                    if (node.type == Syntax.FunctionDeclaration) {
                        that.popContext();
                        return { type: Syntax.EmptyStatement };
                    }
                }
            });
           prg.body = prg.body.filter(function(a) { return a.type != Syntax.EmptyStatement; });
        },

        traverse: function (node) {
            walk.traverse(node, {
                enter: this.enterNode.bind(this),
                leave: this.exitNode.bind(this)
            });
            return node;
        },

        enterNode: function (node, parent) {
            var context = this.context[this.context.length - 1];
            return this.switchKind(node, parent, context, enterStatement, enterExpression);
        },

        exitNode: function (node, parent) {
            var context = this.context[this.context.length - 1];
            return this.switchKind(node, parent, context, exitStatement, exitExpression);
        },

        switchKind: function (node, parent, ctx, statement, expression) {
            switch (node.type) {
                case Syntax.BlockStatement:
                case Syntax.BreakStatement:
                case Syntax.CatchClause:
                case Syntax.ContinueStatement:
                case Syntax.DirectiveStatement:
                case Syntax.DoWhileStatement:
                case Syntax.DebuggerStatement:
                case Syntax.EmptyStatement:
                case Syntax.ExpressionStatement:
                case Syntax.ForStatement:
                case Syntax.ForInStatement:
                case Syntax.FunctionDeclaration:
                case Syntax.IfStatement:
                case Syntax.LabeledStatement:
                case Syntax.Program:
                case Syntax.ReturnStatement:
                case Syntax.SwitchStatement:
                case Syntax.SwitchCase:
                case Syntax.ThrowStatement:
                case Syntax.TryStatement:
                case Syntax.VariableDeclaration:
                case Syntax.VariableDeclarator:
                case Syntax.WhileStatement:
                case Syntax.WithStatement:
                    return statement.call(this, node, parent, ctx);

                case Syntax.AssignmentExpression:
                case Syntax.ArrayExpression:
                case Syntax.ArrayPattern:
                case Syntax.BinaryExpression:
                case Syntax.CallExpression:
                case Syntax.ConditionalExpression:
                case Syntax.FunctionExpression:
                case Syntax.Identifier:
                case Syntax.Literal:
                case Syntax.LogicalExpression:
                case Syntax.MemberExpression:
                case Syntax.NewExpression:
                case Syntax.ObjectExpression:
                case Syntax.ObjectPattern:
                case Syntax.Property:
                case Syntax.SequenceExpression:
                case Syntax.ThisExpression:
                case Syntax.UnaryExpression:
                case Syntax.UpdateExpression:
                case Syntax.YieldExpression:
                    return expression.call(this, node, parent, ctx);

                default:
                    throw new Error('Unknown node type: ' + node.type);
            }
        },

        /**
         *
         * @param {Object} functionAST
         * @param {Array.<TypeInfo> params
         * @param {Scope} parentContext
         * @returns {*}
         */
        inferFunction: function (functionAST, params, parentContext) {
            var functionName = functionAST.id.name;
            var targetContextName = parentContext.getVariableIdentifier(functionName);
            //this.injections[targetContextName] = params;

            // We have a specifc type set in params that we annotate to the
            // function AST
            for(var i = 0; i < params.length; i++) {
                if (i == functionAST.params.length)
                    break;
                var funcParam = new Annotation(functionAST.params[i]);
                funcParam.setFromExtra(params[i].getExtra());
                funcParam.setDynamicValue();
            }

            var oldEntryPoint = this.entryPoint;
            this.entryPoint = targetContextName;
            this.pushContext(parentContext);
            // console.error("Starting to traverse: " + functionName + " in context " + parentContext.str())
            var ast = this.traverse(functionAST);
            this.popContext();
            this.entryPoint = oldEntryPoint;

            return ast;
        },

        inferProgram: function(prg, globalParameters) {
            var params = globalParameters || {};
            var globalContext = registerGlobalContext(prg);
            registerGlobalObjects(globalContext, params.this, getFirstParameterOfEntryFunction(params, this.entryPoint));

            this.pushContext(globalContext);
            // Removes all functions from AST and puts them into a map
            this.buildFunctionMap(prg);
            // Traverse code outside of any function
            this.traverse(prg);
            this.popContext();

            var entryPoint = this.entryPoint;
            if (this.functions.orig.hasOwnProperty(entryPoint)) {
                var ast = this.functions.orig[entryPoint];
                var params = this.annotateParameters(params[entryPoint]);
                this.root.globalParameters[entryPoint] = params;
                // Analyse the main function
                var aast = this.inferFunction(ast, params, globalContext);

                // Put all functions that were used during analysis back into ast
                // Use reverse call order, because some language require so (e.g. GLSL)
                var funcs = [];
                for(var func in this.functions.derived) {
                    var variations = this.functions.derived[func];
                    for (var signature in variations) {
                        funcs.push(variations[signature]);
                    }
                }
                funcs.sort(function(a,b) { return a.order > b.order; });
                for(var i = 0; i < funcs.length; i++) {
                    prg.body.push(funcs[i].ast);
                }

                // Put main function back into ast
                prg.body.push(aast);
            }

            if (this.context.length)
                throw Error("Something went wrong");
            return prg;
        },
        getFunctionInformationByNameAndSignature: function(name, signature) {
            if (this.functions.derived.hasOwnProperty(name)) {
                var derivedFunction = this.functions.derived[name];
                if (derivedFunction.hasOwnProperty(signature)) {
                    return derivedFunction[signature].info;
                }
            }
            return null;
        },
        getFunctionInformationFor: function(name, args, definingContext) {
            var signature = args.reduce(function(str, arg) { return str + arg.getTypeString()}, "");
            var info = this.getFunctionInformationByNameAndSignature(name, signature);
            if (info)
                return info;

            return this.createFunctionInformationFor(name, args, definingContext);
        },
        createFunctionInformationFor: function(name, args, definingContext) {
            var signature = args.reduce(function(str, arg) { return str + arg.getTypeString()}, "");
            if (this.functions.orig.hasOwnProperty(name)) {
                var ast = this.functions.orig[name];
                var variations = this.functions.derived[name] = this.functions.derived[name] || {};
                var derived = variations[signature] = {};
                derived.ast = this.inferFunction(JSON.parse(JSON.stringify(ast)), args, definingContext);
                derived.info = derived.ast.extra.returnInfo;
                derived.info.newName = name.replace(/\./g, '_') + Object.keys(variations).length;
                derived.ast.id.name = derived.info.newName;
                derived.order = this.getCallNumber();
                return derived.info;
            }
            throw new Error("Could not resolve function " + name);
        },
        callGlobalFunction: function (name, args, context) {
            // context.declareVariable(func.name);
            var globalName = context.getVariableIdentifier(name),
                signature = args.reduce(function (str, arg) {
                    return str + arg.getTypeString()
                }, "");

            var info = this.getFunctionInformationByNameAndSignature(globalName, signature);
            if (info)
                return info;

            return this.createFunctionInformationFor(globalName, args, context);
        }
    });


    ns.infer = function (ast, opt) {
        var ti = new TypeInference(ast, opt);
        return ti.inferProgram(ti.root, opt.inject);
    };


}(exports));

(function (ns) {

    var Base = require("../../base/index.js"),
        common = require("../../base/common.js"),
        FunctionAnnotation = require("../../base/annotation.js").FunctionAnnotation,
        TypeInfo = require("../../base/typeinfo.js").TypeInfo,
        Shade = require("./../../interfaces.js"),
        Types = Shade.TYPES,
        Kinds = Shade.OBJECT_KINDS,
        Sources = require("./../../interfaces.js").SOURCES,
        Tools = require('./registry/tools.js');

    var ObjectRegistry = require("./registry/index.js").Registry,
        Scope = require("../../base/scope.js"); // TODO: .getScope(ObjectRegistry);


    var walk = require('estraverse');
    var Syntax = walk.Syntax;
    var VisitorOption = walk.VisitorOption;
    var ANNO = common.ANNO;


    /**
     * Transforms the JS AST to an AST representation convenient
     * for code generation
     * @constructor
     */
    var EmbreeASTTransformer = function (mainId) {
        this.mainId = mainId;
    };

    Base.extend(EmbreeASTTransformer.prototype, {
        registerGlobalContext : function (program) {
            var ctx = new Scope(program, null, {name: "global"});
            ctx.registerObject("Math", ObjectRegistry.getByName("Math"));
            //ctx.registerObject("this", ObjectRegistry.getByName("System"));
            ctx.registerObject("Shade", ObjectRegistry.getByName("Shade"));
            ctx.registerObject("Vec2", ObjectRegistry.getByName("Vec2"));
            ctx.registerObject("Vec3", ObjectRegistry.getByName("Vec3"));
            ctx.registerObject("Vec4", ObjectRegistry.getByName("Vec4"));
            ctx.registerObject("Color", ObjectRegistry.getByName("Color"));
            ctx.registerObject("Texture", ObjectRegistry.getByName("Texture"));
            ctx.registerObject("Mat3", ObjectRegistry.getByName("Mat3"));
            ctx.registerObject("Mat4", ObjectRegistry.getByName("Mat4"));
            ctx.declareVariable("gl_FragCoord", false);
            ctx.updateTypeInfo("gl_FragCoord", new TypeInfo({
                extra: {
                    type: Types.OBJECT,
                    kind: Kinds.FLOAT3
                }
            }));

            return ctx;
        },
        /**
         *
         * @param {Scope} context
         * @param {{blockedNames: Array, systemParameters: Object}} state
         */
        registerThisObject: function (context, state) {
            var thisObject = context.getBindingByName("this");
            if (thisObject && thisObject.isObject()) {
                var properties = thisObject.getNodeInfo();
                for (var name in properties) {
                    var prop = ANNO({}, properties[name]);
                    if (!prop.isDerived())
                        state.blockedNames.push(Tools.getNameForSystem(name));
                }
                var system = ObjectRegistry.getByName("System");
                //console.log(properties, system);
                for (var property in system.derivedParameters) {
                    if(properties[property]) {
                        Base.deepExtend(properties[property], system.derivedParameters[property]);
                    }
                }
                Base.extend(state.systemParameters, properties);
            }
        },


        transformAAST: function (program, opt) {
            opt = opt || {};
            this.root = program;
            var context = this.registerGlobalContext(program),
                name, decl;

            var state = {
                 context: context,
                 contextStack: [context],
                 inMain:  this.mainId == context.str(),
                 globalParameters : program.globalParameters[this.mainId] && program.globalParameters[this.mainId][0] ? program.globalParameters[this.mainId][0].node.extra.info : {},
                 usedParameters: {
                     shader: {},
                     system: {}
                 },
                 systemParameters: {},
                 blockedNames : [],
                 topDeclarations : [],
                 internalFunctions: {},
                 idNameMap : {},
                 headers: [] // Collection of headerlines to define
            }

            // Dmitri: add information about original propertyName
            for (name in state.globalParameters) {
                state.globalParameters[name].propertyName = name;
            }

            program.globals = program.globals || [];

            this.registerThisObject(context, state);

            // TODO: We should also block systemParameters here. We can block all system names, even if not used.
            for(name in state.globalParameters){
                state.blockedNames.push( Tools.getNameForGlobal(name) );
            }

            this.replace(program, state);

            var usedParameters = state.usedParameters;
            for(name in usedParameters.shader){
                decl = handleTopDeclaration(name, usedParameters.shader[name]);
                // Dmitri: add globals to program.globals instead of body
                decl && program.globals.unshift(decl);
            }

            for(name in usedParameters.system){
                decl = handleTopDeclaration(name, usedParameters.system[name]);
                // Dmitri: add globals to program.globals instead of body
                decl && program.globals.unshift(decl);
            }


            var userData = ANNO(this.root).getUserData();
            userData.internalFunctions = state.internalFunctions;

            opt.headers = state.headers;
            return program;
        },
        /**
         *
         * @param {Object!} ast
         * @param {Object!} state
         * @returns {*}
         */
        replace: function(ast, state) {
            ast = walk.replace(ast, {

                enter: function (node, parent, cb) {
                    //console.log("Enter:", node.type);
                    switch (node.type) {
                        case Syntax.Identifier:
                            return handleIdentifier(node, parent, state.blockedNames, state.idNameMap);
                        case Syntax.IfStatement:
                            return handleIfStatement(node, state, this, cb);
                        case Syntax.ConditionalExpression:
                            return handleConditionalExpression(node, state, this, cb);
                        case Syntax.LogicalExpression:
                            return handleEnterLogicalExpression(node, this, state);
                        case Syntax.FunctionDeclaration:
                            // No need to declare, this has been annotated already
                            var parentContext = state.contextStack[state.contextStack.length - 1];
                            var context = new Scope(node, parentContext, {name: node.id.name });
                            state.context = context;
                            state.contextStack.push(context);
                            state.inMain = this.mainId == context.str();
                            break;
                    }
                }.bind(this),

                leave: function(node, parent) {
                    switch(node.type) {
                        case Syntax.MemberExpression:
                            return handleMemberExpression(node, parent, state);
                        case Syntax.NewExpression:
                            return handleNewExpression(node, parent, state.context);
                        case Syntax.LogicalExpression:
                            return handleExitLogicalExpression(node, this, state);
                        case Syntax.CallExpression:
                            return handleCallExpression(node, parent, state);
                        case Syntax.UnaryExpression:
                            return handleUnaryExpression(node, parent, state);
                        case Syntax.FunctionDeclaration:
                            state.context = state.contextStack.pop();
                            state.inMain = state.context.str() == this.mainId;
                            if (state.inMain)
                                return handleMainFunction(node, parent, state.context);
                        case Syntax.ReturnStatement:
                            if(state.inMain) {
                                return handleReturnInMain(node, state.context);
                            }
                            break;
                        case Syntax.BinaryExpression:
                            return handleBinaryExpression(node, parent);

                    }
                }.bind(this)
            });
            return ast;
        }
    });

    var handleTopDeclaration = function(name, typeInfo){
        var propertyLiteral =  { type: Syntax.Identifier, name: name};
        var propertyAnnotation =  ANNO(propertyLiteral);
        propertyAnnotation.setFromExtra(typeInfo);

        if (propertyAnnotation.isNullOrUndefined() || propertyAnnotation.isDerived() || propertyAnnotation.isFunction())
            return;

        if( propertyAnnotation.isOfType(Types.ARRAY) && typeInfo.staticSize == 0)
            return;

        var decl = {
            type: Syntax.VariableDeclaration,
            declarations: [
                {
                    type: Syntax.VariableDeclarator,
                    id: propertyLiteral,
                    init: null
                }
            ],
            kind: "var"
        };
        var declAnnotation =  ANNO(decl.declarations[0]);
        declAnnotation.copy(propertyAnnotation);
        return decl;
    }

    var handleIdentifier = function(node, parent, blockedNames, idNameMap){
        if(parent.type == Syntax.MemberExpression)
            return node;

        var name = node.name;
        if(idNameMap[name]) {
            node.name = idNameMap[name];
            return node;
        }
        var newName = Tools.generateFreeName(name, blockedNames);
        idNameMap[name] = newName;
        node.name = newName;
        return node;
    }


    var handleUnaryExpression = function(node, parent, state) {
        if(node.operator == "!") {
            var argument = ANNO(node.argument);
            switch(argument.getType()) {
                case Types.INT:
                case Types.NUMBER:
                    return {
                        type: Syntax.BinaryExpression,
                        operator: "==",
                        left: node.argument,
                        right: {
                            type: Syntax.Literal,
                            value: 0,
                            extra: {
                                type: argument.getType()
                            }
                        }
                    }
                    break;
            }
        }
    }

    var handleReturnInMain = function(node, context) {
        if (node.argument) {
            return {
                type: Syntax.BlockStatement,
                body: [
                    {
                        type: Syntax.ExpressionStatement,
                        expression: {
                            type: Syntax.CallExpression,
                            callee: {
                                type: Syntax.Identifier,
                                name: "addClosureToBRDFs",
                                extra: {
                                    type: "function"
                                }
                            },
                            arguments: [
                                {
                                    type: Syntax.Identifier,
                                    name: "brdfs",
                                    extra: {
                                        type: "object",
                                        kind: "any",
                                        global: "true"
                                    }
                                },
                                castToColor(node.argument, context)
                            ]
                        },
                        extra: {
                            type: "void"
                        }
                    },
                    {
                        type: Syntax.ReturnStatement
                    }
                ]
            }
/*
            return {
                type: Syntax.BlockStatement,
                body: [
                    {
                        type: Syntax.AssignmentExpression,
                        operator: "=",
                        left: {
                            type: Syntax.Identifier,
                            name: "gl_FragColor"
                        },
                        right: castToColor(node.argument, context)
                    },
                    {
                        type: Syntax.ReturnStatement
                    }
                ]
            }
            */
        } else {
            return {
                type: Syntax.ReturnStatement
            }
        }
    };

    var handleMainFunction = function(node, parent, context) {
        var anno = new FunctionAnnotation(node);
        anno.setReturnInfo({ type: Types.UNDEFINED });

        node.extra.cxxModifier = "const"; // FIXME This should be possibly moved to FunctionAnnotation
        // Dmitri: Define Embree's main shade function
        node.params = [
            {
                name: "ray",
                type: Syntax.Identifier,
                extra: {
                    global: true,
                    kind: "any",
                    type: "object",
                    cxxType: "const Ray&"
                }
            },
            {
                name: "currentMedium",
                type: Syntax.Identifier,
                extra: {
                    global: true,
                    kind: "any",
                    type: "object",
                    cxxType: "const Medium&"
                }
            },
            {
                name: "dg",
                type: Syntax.Identifier,
                extra: {
                    global: true,
                    kind: "any",
                    type: "object",
                    cxxType: "const DifferentialGeometry&"
                }
            },
            {
                name: "brdfs",
                type: Syntax.Identifier,
                extra: {
                    global: true,
                    kind: "any",
                    type: "object",
                    cxxType: "CompositedBRDF&"
                }
            }
        ]
        // Rename to 'shade'
        node.id.name = "shade";
        //console.log(node);
    }


    function getNameOfNode(node) {
        switch (node.type) {
            case Syntax.Identifier:
                return node.name;
            case Syntax.MemberExpression:
                return getNameOfNode(node.object) + "." + getNameOfNode(node.property);
            case Syntax.NewExpression:
                return getNameOfNode(node.callee);
            default:
                return "unknown(" + node.type + ")";
        }
    };

    var handleCallExpression = function (callExpression, parent, state) {
        var topDeclarations = state.topDeclarations, context = state.context;
        // Is this a call on an object?
        if (callExpression.callee.type == Syntax.MemberExpression) {
            var calleeReference = common.getTypeInfo(callExpression.callee, context);
            if(!(calleeReference && calleeReference.isFunction()))
                Shade.throwError(callExpression, "Something went wrong in type inference, " + callExpression.callee.object.name);

            var object = callExpression.callee.object,
                propertyName = callExpression.callee.property.name;

            var objectReference = common.getTypeInfo(object, context);
            if(!objectReference)  {
                Shade.throwError(callExpression, "Internal: No object info for: " + object);
            }

            var objectInfo = context.getObjectInfoFor(objectReference);
            if(!objectInfo) { // Every object needs an info, otherwise we did something wrong
                Shade.throwError(callExpression, "Internal Error: No object registered for: " + objectReference.getTypeString() + ", " + getNameOfNode(callExpression.callee.object)+", "+callExpression.callee.object.type);
            }
            if (objectInfo.hasOwnProperty(propertyName)) {
                var propertyHandler = objectInfo[propertyName];
                if (typeof propertyHandler.callExp == "function") {
                    var args = common.createTypeInfo(callExpression.arguments, context);
                    return propertyHandler.callExp(callExpression, args, parent, state);
                }
            }
        }
    }

    var handleNewExpression = function(newExpression, parent, context){
        var entry = context.getBindingByName(newExpression.callee.name);
        //console.error(entry);
        if (entry && entry.hasConstructor()) {
            var constructor = entry.getConstructor();
            return constructor(newExpression);
        }
       else {
            throw new Error("ReferenceError: " + newExpression.callee.name + " is not defined");
        }
    }


    var handleMemberExpression = function (memberExpression, parent, state) {
        var propertyName = memberExpression.property.name,
            context = state.context,
            parameterName,
            propertyLiteral;

        if (memberExpression.computed) {
            return handleComputedMemberExpression(memberExpression, parent, state);
        }

        var objectReference = common.getTypeInfo(memberExpression.object, context);

        if (!objectReference || !objectReference.isObject())
            Shade.throwError(memberExpression, "Internal Error: Object of Member expression is no object.");

        var objectInfo = context.getObjectInfoFor(objectReference);
        if(!objectInfo) {// Every object needs an info, otherwise we did something wrong
            Shade.throwError(memberExpression, "Internal Error: No object registered for: " + objectReference.getTypeString() + JSON.stringify(memberExpression.object));
        }
        if (!objectInfo.hasOwnProperty(propertyName))
            Shade.throwError(memberExpression, "Internal Error: Object of type " + objectReference.getTypeString() + " has no property '" + propertyName +"'");

        var propertyHandler = objectInfo[propertyName];
        if (typeof propertyHandler.property == "function") {
            var result = propertyHandler.property(memberExpression, parent, context, state);
            return result;
        }

        var usedParameters = state.usedParameters;
        if(objectReference.isGlobal()) {

            // Dmitri: Handle Embrees special vertex attributes
            if (memberExpression.property.extra.source == Sources.VERTEX) {
                if (memberExpression.object.name == "env")
                {
                    if (memberExpression.property.name == "texcoord")
                        return {
                            type: Syntax.MemberExpression,
                            object: {
                                type: Syntax.Identifier,
                                name: "dg"
                            },
                            property: {
                                type: Syntax.Identifier,
                                name: "st"
                            },
                            extra: {
                                type: "object",
                                kind: "float2",
                                source: "vertex"
                            }
                        };
                    else if (memberExpression.property.name == "normal")
                        return {
                            type: Syntax.MemberExpression,
                            object: {
                                type: Syntax.Identifier,
                                name: "dg"
                            },
                            property: {
                                type: Syntax.Identifier,
                                name: "Ns"
                            },
                            extra: {
                                type: "object",
                                kind: "float3",
                                source: "vertex"
                            }
                        };
                }
            }

            parameterName = Tools.getNameForGlobal(propertyName);
            if(!usedParameters.shader.hasOwnProperty(parameterName)) {
                usedParameters.shader[parameterName] = state.globalParameters[propertyName];
            }

            propertyLiteral =  { type: Syntax.Identifier, name: parameterName};
            ANNO(propertyLiteral).copy(ANNO(memberExpression));
            return propertyLiteral;
        }
        if (memberExpression.object.type == Syntax.ThisExpression) {
            parameterName = Tools.getNameForSystem(propertyName);
            if(!usedParameters.system.hasOwnProperty(parameterName)) {
                usedParameters.system[parameterName] = state.systemParameters[propertyName];
            }

            propertyLiteral =  { type: Syntax.Identifier, name: parameterName};
            ANNO(propertyLiteral).copy(ANNO(memberExpression));
            return propertyLiteral;
        }

    };

    var handleComputedMemberExpression = function(memberExpression, parent, state) {
        var objectReference = common.getTypeInfo(memberExpression.object, state.context);
        if (!objectReference.isArray()) {
            Shade.throwError(memberExpression, "In shade.js, [] access is only allowed on arrays.");
        }

    }

    var handleBinaryExpression = function (binaryExpression, parent, cb) {
        // In GL, we can't mix up floats, ints and boold for binary expressions
        var left = ANNO(binaryExpression.left),
            right = ANNO(binaryExpression.right);

        if (left.isNumber() && right.isInt()) {
            binaryExpression.right = Tools.castToFloat(binaryExpression.right);
        }
        else if (right.isNumber() && left.isInt()) {
            binaryExpression.left = Tools.castToFloat(binaryExpression.left);
        }

        if (binaryExpression.operator == "%") {
            return handleModulo(binaryExpression);
        }
        return binaryExpression;
    }

    function castToInt(ast, force) {
        var exp = ANNO(ast);

        if (!exp.isInt() || force) {   // Cast
            return {
                type: Syntax.CallExpression,
                callee: {
                    type: Syntax.Identifier,
                    name: "int"
                },
                arguments: [ast]
            }
        }
        return ast;
    }

    function castToVec4(ast, context) {
        var exp = TypeInfo.createForContext(ast, context);

        if (exp.isOfKind(Kinds.FLOAT4) || exp.isOfKind(Kinds.COLOR_CLOSURE))
            return ast;

        if (exp.isOfKind(Kinds.FLOAT3)) {
            return {
                type: Syntax.CallExpression,
                callee: {
                    type: Syntax.Identifier,
                    name: "vec4"
                },
                arguments: [ast, { type: Syntax.Literal, value: 1.0, extra: { type: Types.NUMBER} }]
            }
        }
        Shade.throwError(ast, "Can't cast from '" + exp.getTypeString() + "' to vec4");
    }

    function castToColor(ast, context) {
        var exp = TypeInfo.createForContext(ast, context);

        if (exp.isOfKind(Kinds.FLOAT4) || exp.isOfKind(Kinds.COLOR_CLOSURE))
            return ast;

        if (exp.isOfKind(Kinds.FLOAT3)) {
            return {
                type: Syntax.CallExpression,
                callee: {
                    type: Syntax.Identifier,
                    name: "toColor"
                },
                arguments: [ast]
            }
        }
        Shade.throwError(ast, "Can't cast from '" + exp.getTypeString() + "' to vec4");
    }

    var handleModulo = function (binaryExpression) {
        binaryExpression.right = Tools.castToFloat(binaryExpression.right);
        binaryExpression.left = Tools.castToFloat(binaryExpression.left);
        return {
            type: Syntax.CallExpression,
            callee: {
                type: Syntax.Identifier,
                name: "mod"
            },
            arguments: [
                binaryExpression.left,
                binaryExpression.right
            ],
            extra: {
                type: Types.NUMBER
            }
        }
    }

    var handleConditionalExpression = function(node, state, root, cb) {
        var consequent = ANNO(node.consequent);
        var alternate = ANNO(node.alternate);
        if (consequent.canEliminate() || alternate.canEliminate()) {
            // In this case, we replace the whole conditional expression by the
            // resulting expression. We have to do the traversal manually and skip the
            // subtree for the parent traversal.
            cb(VisitorOption.Skip);
            return root.replace(consequent.canEliminate() ? node.alternate : node.consequent , state);
        }
    }

    var handleIfStatement = function (node, state, root, cb) {
        var test = ANNO(node.test);
        var consequent = ANNO(node.consequent);
        var alternate = node.alternate ? ANNO(node.alternate) : null;
        if (test.hasStaticValue()) {
            var staticValue = test.getStaticValue();
            if (staticValue === true) {
                cb(VisitorOption.Skip);
                return root.replace(node.consequent, state);
            }
            if (staticValue === false) {
                if (alternate) {
                    cb(VisitorOption.Skip);
                    return root.replace(node.alternate, state);
                }
                return {
                    type: Syntax.EmptyStatement
                }
            }
            Shade.throwError(node, "Internal error: Unknown static value: " + test.getStaticValue());
        }

        // We still have a real if statement
       var test = ANNO(node.test);
       switch(test.getType()) {
           case Types.INT:
           case Types.NUMBER:
               node.test = {
                   type: Syntax.BinaryExpression,
                   operator: "!=",
                   left: node.test,
                   right: {
                       type: Syntax.Literal,
                       value: 0,
                       extra: {
                           type: test.getType()
                       }
                   }
               }
               break;
       }


    };

    var handleEnterLogicalExpression = function (node, root, state) {
        var left = ANNO(node.left);
        var right = ANNO(node.right);
        if (left.canEliminate())
            return root.replace(node.right, state);
        if (right.canEliminate())
            return root.replace(node.left, state);
    }

    var handleExitLogicalExpression = function(node, root, state) {
        var left = ANNO(node.left);
        var right = ANNO(node.right);

        if (left.isBool() && right.isBool()) {
            // Everything is okay, no need to modify anything
            return;
        }

        // Now we have to implement the JS boolean semantic for GLSL
        if (left.canNumber()) {
            var test =  node.left;
            return {
                type: Syntax.ConditionalExpression,
                test: {
                    type: Syntax.BinaryExpression,
                    operator: "==",
                    left: test,
                    right: {
                        type: Syntax.Literal,
                        value: left.isNumber() ? 0.0 : left.isInt() ? 0 : "false",
                        extra: {
                            type : left.getType(),
                            staticValue: left.isNumber() ? 0.0 : left.isInt() ? 0 : "false"
                        }
                    },
                    extra: { type: Types.BOOLEAN }
                },
                consequent: node.right,
                alternate: test
            }
        }
    }


    // Exports
    ns.EmbreeASTTransformer = EmbreeASTTransformer;


}(exports));

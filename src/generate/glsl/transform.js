(function (ns) {

    var Base = require("../../base/index.js"),
        ANNO = require("../../base/annotation.js").ANNO,
        Annotation = require("../../base/annotation.js").Annotation,
        FunctionAnnotation = require("../../base/annotation.js").FunctionAnnotation,
        TypeInfo = require("../../base/typeinfo.js").TypeInfo,
        Shade = require("./../../interfaces.js"),
        Types = Shade.TYPES,
        Kinds = Shade.OBJECT_KINDS,
        Sources = require("./../../interfaces.js").SOURCES,
        Tools = require('./registry/tools.js');

    var ObjectRegistry = require("./registry/index.js").Registry,
        Context = require("../../base/context.js").getContext(ObjectRegistry);


    var walk = require('estraverse');
    var Syntax = walk.Syntax;
    var VisitorOption = walk.VisitorOption;


    /**
     * Transforms the JS AST to an AST representation convenient
     * for code generation
     * @constructor
     */
    var GLASTTransformer = function (mainId) {
        this.mainId = mainId;
    };

    Base.extend(GLASTTransformer.prototype, {
        registerGlobalContext : function (program) {
            var ctx = new Context(program, null, {name: "global"});
            ctx.registerObject("Math", ObjectRegistry.getByName("Math"));
            ctx.registerObject("this", ObjectRegistry.getByName("System"));
            ctx.registerObject("Shade", ObjectRegistry.getByName("Shade"));
            ctx.registerObject("Vec2", ObjectRegistry.getByName("Vec2"));
            ctx.registerObject("Vec3", ObjectRegistry.getByName("Vec3"));
            ctx.registerObject("Vec4", ObjectRegistry.getByName("Vec4"));
            ctx.registerObject("Color", ObjectRegistry.getByName("Vec3"));
            ctx.registerObject("Texture", ObjectRegistry.getByName("Texture"));
            ctx.declareVariable("gl_FragCoord", false);
            ctx.updateExpression("gl_FragCoord", new TypeInfo({
                extra: {
                    type: Types.OBJECT,
                    kind: Kinds.FLOAT3
                }
            }));
            ctx.declareVariable("_sys_normalizedCoords", false);
            ctx.updateExpression("_sys_normalizedCoords", new TypeInfo({
                extra: {
                    type: Types.OBJECT,
                    kind: Kinds.FLOAT3
                }
            }));

            return ctx;
        },
        transformAAST: function (program) {
            this.root = program;
            var context = this.registerGlobalContext(program);

            var state = {
                 context: context,
                 contextStack: [context],
                 inMain:  this.mainId == context.str(),
                 globalParameters : program.injections[this.mainId] && program.injections[this.mainId][0] ? program.injections[this.mainId][0].node.extra.info : {},
                 systemParameters: {},
                 blockedNames : [],
                 topDeclarations : [],
                 idNameMap : {}
            }


            // TODO: We should also block systemParameters here. We can block all system names, even if not used.
            for(var name in state.globalParameters){
                state.blockedNames.push( getNameForGlobal(name) );
            }

            this.replace(program, state);

            for(var name in state.systemParameters){
                var decl = handleTopDeclaration(name, state.systemParameters[name]);
                decl && program.body.unshift(decl);
            }

            for(var name in state.globalParameters){
                var decl = handleTopDeclaration(getNameForGlobal(name), state.globalParameters[name]);
                decl && program.body.unshift(decl);
            }

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
                            return handleIfStatement(node);
                        case Syntax.ConditionalExpression:
                            return handleConditionalExpression(node, state, this, cb);
                        case Syntax.LogicalExpression:
                            return handleEnterLogicalExpression(node, this, state);
                        case Syntax.FunctionDeclaration:
                            // No need to declare, this has been annotated already
                            var parentContext = state.contextStack[state.contextStack.length - 1];
                            var context = new Context(node, parentContext, {name: node.id.name });
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
                            return handleCallExpression(node, parent, state.topDeclarations, state.context);
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

        if (propertyAnnotation.isNullOrUndefined())
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
        if(idNameMap[name]) node.name = idNameMap[name];
        var newName = name.replace(/_+/g, "_"), i = 1;
        while(blockedNames.indexOf(newName) != -1){
            newName = name + "_" + (++i);
        }
        idNameMap[name] = newName;
        node.name = newName;
        return node;
    }


    var handleReturnInMain = function(node, context) {
        if (node.argument) {
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
                        right: castToVec4(node.argument, context)
                    },
                    {
                        type: Syntax.ReturnStatement
                    }
                ]
            }
        } else {
            return {
                type: Syntax.ExpressionStatement,
                expression : {
                    type: Syntax.Identifier,
                    name: "discard"
                }
            }
        }
    };

    var handleMainFunction = function(node, parent, context) {
        var anno = new FunctionAnnotation(node);
        anno.setReturnInfo({ type: Types.UNDEFINED });

        // Main has no parameters
        node.params = [];
        // Rename to 'main'
        node.id.name = "main";
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

    function getObjectReferenceFromNode(object, context) {
        switch (object.type) {
            case Syntax.NewExpression:
            case Syntax.CallExpression:
            case Syntax.MemberExpression:
            case Syntax.BinaryExpression:
            case Syntax.Identifier:
                return context.createTypeInfo(object);
                break;
            case Syntax.ThisExpression:
                return context.getBindingByName("this");
                break;
            default:
                throw new Error("Unhandled object type in GLSL generation: " + object.type);
        }
    }

    var handleCallExpression = function (callExpression, parent, topDeclarations, context) {

        // Is this a call on an object?
        if (callExpression.callee.type == Syntax.MemberExpression) {
            var calleeReference = getObjectReferenceFromNode(callExpression.callee, context);
            if(!(calleeReference && calleeReference.isFunction()))
                Shade.throwError(callExpression, "Something went wrong in type inference, " + callExpression.callee.object.name);

            var object = callExpression.callee.object,
                propertyName = callExpression.callee.property.name;

            var objectReference = getObjectReferenceFromNode(object, context);
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
                    var args = Annotation.createAnnotatedNodeArray(callExpression.arguments, context);
                    return propertyHandler.callExp(callExpression, args, parent);
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
            throw new Error("ReferenceError: " + node.callee.name + " is not defined");
        }
    }


    var handleMemberExpression = function (memberExpression, parent, state) {
        var propertyName = memberExpression.property.name,
            context = state.context;

        var objectReference = getObjectReferenceFromNode(memberExpression.object, context);

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
        else if(objectReference.isGlobal()) {
            var propertyLiteral =  { type: Syntax.Identifier, name: getNameForGlobal(propertyName)};
            ANNO(propertyLiteral).copy(ANNO(memberExpression));
            return propertyLiteral;
        }

    };

    var getNameForGlobal = function(baseName) {
        var name = "_env_" + baseName;
        return name.replace(/_+/g, "_");
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

        if (exp.isOfKind(Kinds.FLOAT4))
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

    var handleIfStatement = function (node) {
        var consequent = ANNO(node.consequent);
        var alternate = node.alternate ? ANNO(node.alternate) : null;
        if (consequent.canEliminate()) {
            if (alternate) {
                return node.alternate;
            }
            return {
                type: Syntax.EmptyStatement
            }
        } else if (alternate && alternate.canEliminate()) {
            return node.consequent;
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
    ns.GLASTTransformer = GLASTTransformer;


}(exports));

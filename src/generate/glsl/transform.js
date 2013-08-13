(function (ns) {

    var Base = require("../../base/index.js"),
        Annotation = require("../../base/annotation.js").Annotation,
        FunctionAnnotation = require("../../base/annotation.js").FunctionAnnotation,
        TypeInfo = require("../../base/typeinfo.js").TypeInfo,
        Shade = require("./../../interfaces.js"),
        Types = Shade.TYPES,
        Kinds = Shade.OBJECT_KINDS,
        Sources = require("./../../interfaces.js").SOURCES;

    var ObjectRegistry = require("./registry/index.js").Registry,
        Context = require("../../base/context.js").getContext(ObjectRegistry);


    var walk = require('estraverse');
    var Syntax = walk.Syntax;


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
            ctx.declareVariable("gl_FragCoord", false);
            ctx.updateExpression("gl_FragCoord", new TypeInfo({
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
                 injections : program.injections[this.mainId] ? program.injections[this.mainId][0] : null,
                 blockedNames : [],
                 topDeclarations : [],
                 idNameMap : {}
            }



            for(var name in state.injections){
                state.blockedNames.push(name);
            }

            this.replace(program, state);

            for(var name in state.injections){
                if(name !== "_global")
                    var decl = handleTopDeclaration(name, state.injections);
                    if (decl)
                        program.body.unshift(decl);
            }

            return program;
        },
        replace: function(ast, state) {
            walk.replace(ast, {

                enter: function (node, parent) {
                    //console.log("Enter:", node.type);
                    switch (node.type) {
                        case Syntax.Identifier:
                            return handleIdentifier(node, parent, state.blockedNames, state.idNameMap);
                        case Syntax.IfStatement:
                            return handleIfStatement(node);
                        case Syntax.ConditionalExpression:
                            return handleConditionalExpression(node, state, this);
                        case Syntax.LogicalExpression:
                            return handleLogicalExpression(node, this);
                        case Syntax.FunctionDeclaration:
                            // No need to declare, this has been annotated already
                            var parentContext = state.contextStack[state.contextStack.length - 1];
                            var context = new Context(node, parentContext, {name: node.id.name });
                            var anno = new FunctionAnnotation(node);
                            if(!anno.isUsed()) {
                                return {
                                    type: Syntax.EmptyStatement
                                }
                            }
                            state.context = context;
                            state.contextStack.push(context);
                            state.inMain = this.mainId == context.str();
                            break;
                    }
                }.bind(this),

                leave: function(node, parent) {
                    switch(node.type) {
                        case Syntax.MemberExpression:
                            return handleMemberExpression(node, parent, state.topDeclarations, state.context);
                        case Syntax.CallExpression:
                            return handleCallExpression(node, parent, state.topDeclarations, state.context);
                        case Syntax.FunctionDeclaration:
                            state.context = state.contextStack.pop();
                            state.inMain = state.context.str() == this.mainId;
                            if (state.inMain)
                                return handleMainFunction(node, parent, state.context);
                        case Syntax.ReturnStatement:
                            if(state.inMain) {
                                return handleReturnInMain(node);
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

    var handleTopDeclaration = function(name, injections){
        var propertyLiteral =  { type: Syntax.Identifier, name: getNameForGlobal(injections, name)};
        var propertyAnnotation =  new Annotation(propertyLiteral);
        propertyAnnotation.setFromExtra(injections[name]);

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
        var declAnnotation =  new Annotation(decl.declarations[0]);
        declAnnotation.copy(propertyAnnotation);
        return decl;
    }

    var handleIdentifier = function(node, parent, blockedNames, idNameMap){
        if(parent.type == Syntax.FunctionDeclaration)
            return node;
        var name = node.name;
        if(idNameMap[name]) node.name = idNameMap[name];
        var newName = name, i = 1;
        while(blockedNames.indexOf(newName) != -1){
            newName = name + "_" + (++i);
        }
        idNameMap[name] = newName;
        node.name = newName;
        return node;
    }


    var handleReturnInMain = function(node) {
        if (node.argument) {
            return {
                type: Syntax.AssignmentExpression,
                operator: "=",
                left: {
                    type: Syntax.Identifier,
                    name: "gl_FragColor"
                },
                right: node.argument
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

        // console.log(context);
        // Main has no parameters
        node.params = [];
        // Rename to 'main'
        node.id.name = "main";
        //console.log(node);
    }


    function getObjectReferenceFromNode(object, context) {
        switch (object.type) {
            case Syntax.NewExpression:
            case Syntax.CallExpression:
            case Syntax.MemberExpression:
                return context.createTypeInfo(object);
                break;
            case Syntax.Identifier:
                return context.getBindingByName(object.name);
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
                throw new Error("Something went wrong in type inference");

            var object = callExpression.callee.object,
                propertyName = callExpression.callee.property.name;

            var objectReference = getObjectReferenceFromNode(object, context);
            if(!objectReference)  {
                console.error("No object info for: ", object);
                return;
            }

            var objectInfo = context.getObjectInfoFor(objectReference);
            if(!objectInfo) { // Every object needs an info, otherwise we did something wrong
                console.error("No object registered for: ", objectReference.getTypeString(), JSON.stringify(callExpression.object));
                return;
                //Shade.throwError(callExpression, "Internal: No registration for object: " + objectReference.getTypeString() + ", " + JSON.stringify(callExpression.object));
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


    var handleMemberExpression = function (memberExpression, parent, topDeclarations, context) {
        var propertyName = memberExpression.property.name;

        var objectReference = getObjectReferenceFromNode(memberExpression.object, context);

        if (objectReference && objectReference.isObject()) {
            var objectInfo = context.getObjectInfoFor(objectReference);
            if(!objectInfo) {// Every object needs an info, otherwise we did something wrong
                console.error("No object registered for: ", objectReference.getTypeString(), JSON.stringify(memberExpression.object))
                //Shade.throwError(memberExpression, "Internal: No registration for object: " + objectReference.getTypeString() + ", " + JSON.stringify(memberExpression.object));
                return;
            }
            if (objectInfo.hasOwnProperty(propertyName)) {
                var propertyHandler = objectInfo[propertyName];
                if (typeof propertyHandler.property == "function") {
                    return propertyHandler.property(memberExpression, parent, context);
                }
            }
        }

        var exp = new Annotation(memberExpression);
        if(objectReference && objectReference.isGlobal()) {
            var propertyLiteral =  { type: Syntax.Identifier, name: getNameForGlobal(objectReference, propertyName)};
            var propertyAnnotation =  new Annotation(propertyLiteral);
            propertyAnnotation.copy(exp);
            propertyAnnotation.setGlobal(true);

            return propertyLiteral;
        }

    };

    var getNameForGlobal = function(reference, baseName) {
        var entry = reference[baseName];
        if(entry) {
            if (entry.source == Sources.VERTEX) {
                return "frag_" + baseName;
            }
        }
        return baseName;
    }

    var handleBinaryExpression = function (binaryExpression, parent, cb) {
        // In GL, we can't mix up floats, ints and boold for binary expressions
        var left = new Annotation(binaryExpression.left),
            right = new Annotation(binaryExpression.right);

        if (left.isNumber() && right.isInt()) {
            binaryExpression.right = castToFloat(binaryExpression.right);
        }
        else if (right.isNumber() && left.isInt()) {
            binaryExpression.left = castToFloat(binaryExpression.left);
        }

        if (binaryExpression.operator == "%") {
            return handleModulo(binaryExpression);
        }
        return binaryExpression;
    }

    function castToFloat(ast) {
        var exp = new Annotation(ast);

        if (!exp.isNumber()) {   // Cast
            return {
                type: Syntax.CallExpression,
                callee: {
                    type: Syntax.Identifier,
                    name: "float"
                },
                arguments: [ast]
            }
        }
        return ast;
    }

    function castToInt(ast, force) {
        var exp = new Annotation(ast);

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

    var handleModulo = function (binaryExpression) {
        binaryExpression.right = castToFloat(binaryExpression.right);
        binaryExpression.left = castToFloat(binaryExpression.left);
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

    var handleConditionalExpression = function(node, state, root) {
        var consequent = new Annotation(node.consequent);
        var alternate = new Annotation(node.alternate);
        if (consequent.canEliminate()) {
            return root.replace(node.alternate, state);
        }
        if (alternate.canEliminate()) {
            return root.replace(node.consequent);
        }

    }

    var handleIfStatement = function (node) {
        var consequent = new Annotation(node.consequent);
        var alternate = node.alternate ? new Annotation(node.alternate) : null;
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
       var test = new Annotation(node.test);
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

    var handleLogicalExpression = function (node, root) {
        var left = new Annotation(node.left);
        var right = new Annotation(node.right);
        if (left.canEliminate())
            return root.replace(node.right);
        if (right.canEliminate())
            return root.replace(node.left);
    }

    // Exports
    ns.GLASTTransformer = GLASTTransformer;


}(exports));

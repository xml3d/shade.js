(function (ns) {

    var Base = require("../../base/index.js"),
        Annotation = require("../../base/annotation.js").Annotation,
        FunctionAnnotation = require("../../base/annotation.js").FunctionAnnotation,
        Context = require("../../base/context.js").Context,
        Types = require("./../../interfaces.js").TYPES,
        Shade = require("./../../interfaces.js"),
        Types = require("./../../interfaces.js").TYPES,
        Sources = require("./../../interfaces.js").SOURCES;

    var ObjectRegistry = require("./registry/index.js").Registry;


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
            //ctx.registerObject("Vector3", ObjectRegistry.getByName("Vector3"));
            //ctx.registerObject("Shade", ObjectRegistry.getByName("Shade"));
            return ctx;
        },
        transformAAST: function (program) {
            this.root = program;
            var context = this.registerGlobalContext(program),
                contextStack = [context],
                mainId = this.mainId,
                inMain = mainId == context.str(),
                topDeclarations = [],
                injections = program.injections[this.mainId] ? program.injections[this.mainId][0] : null,
                blockedNames = [],
                idNameMap = {};

            for(var name in injections){
                blockedNames.push(name);
            }

            walk.replace(program, {

                enter: function (node, parent) {
                    //console.log("Enter:", node.type);
                    switch (node.type) {
                        case Syntax.Identifier:
                            return handleIdentifier(node, parent, blockedNames, idNameMap);
                        case Syntax.IfStatement:
                            return handleIfStatement(node);
                        case Syntax.LogicalExpression:
                            return handleLogicalExpression(node, parent);
                        case Syntax.FunctionDeclaration:
                            // No need to declare, this has been annotated already
                            var parentContext = contextStack[contextStack.length - 1];
                            context = new Context(node, parentContext, {name: node.id.name });
                            contextStack.push(context);
                            inMain = mainId == context.str()
                            break;
                    }
                },

                leave: function(node, parent) {
                    switch(node.type) {
                        case Syntax.MemberExpression:
                            return handleMemberExpression(node, parent, topDeclarations, context);
                        case Syntax.FunctionDeclaration:
                            context = contextStack.pop();
                            inMain = context.str() == mainId;
                            if (inMain)
                                return handleMainFunction(node, parent, context);
                        case Syntax.ReturnStatement:
                            if(inMain) {
                                return handleReturnInMain(node);
                            }
                            break;
                        case Syntax.BinaryExpression:
                            return handleBinaryExpression(node, parent);

                    }
                }
            });


            for(var name in injections){
                if(name !== "_global")
                    program.body.unshift(handleTopDeclaration(name, injections));
            }

            return program;
        }
    });

    var handleTopDeclaration = function(name, injections){
        var propertyLiteral =  { type: Syntax.Identifier, name: getNameForGlobal(injections, name)};
        var propertyAnnotation =  new Annotation(propertyLiteral);
        propertyAnnotation.setFromExtra(injections[name]);

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


    var handleMemberExpression = function (memberExpression, parent, topDeclarations, context) {
        var object = memberExpression.object,
            property = memberExpression.property,
            propertyName = property.name;

        var objectName = null;
        switch(object.type) {
            case Syntax.Identifier:
                objectName = object.name;
                break;
            case Syntax.ThisExpression:
                objectName = "this";
                break;
            default:
                //throw new Error("Unhandled object type in GLSL generation");
        }

        var objectReference = context.getBindingByName(objectName);

        if (objectReference && objectReference.isObject()) {
            var objectInfo = objectReference.getObjectInfo();
            if(!objectInfo) // Every object needs an info, otherwise we did something wrong
                Shade.throwError(memberExpression, "Internal: Incomplete registration for object: " + JSON.stringify(memberExpression.object));
            if (objectInfo.hasOwnProperty(propertyName)) {
                var propertyHandler = objectInfo[propertyName];
                if (typeof propertyHandler == "function") {
                    return propertyHandler(memberExpression, parent);
                }
            }
        }

        var exp = new Annotation(memberExpression);
        if(objectReference && objectReference.isGlobal()) {
            var propertyLiteral =  { type: Syntax.Identifier, name: getNameForGlobal(objectReference, property.name)};
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

    var handleModulo = function (binaryExpression) {
        return {
            type: Syntax.CallExpression,
            callee: {
                type: Syntax.Identifier,
                name: "mod"
            },
            arguments: [
                binaryExpression.left,
                binaryExpression.right
            ]
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
                   operator: "==",
                   left: node.test,
                   right: {
                       type: Syntax.Literal,
                       value: 0.0,
                       extra: {
                           type: Types.NUMBER
                       }
                   }
               }
       }


    };

    var handleLogicalExpression = function (node) {
        var left = new Annotation(node.left);
        var right = new Annotation(node.right);
        if (left.canEliminate())
            return node.right;
        if (right.canEliminate())
            return node.left;
    }

    // Exports
    ns.GLASTTransformer = GLASTTransformer;


}(exports));

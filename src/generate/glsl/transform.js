(function (ns) {

    var Base = require("../../base/index.js"),
        Annotation = require("../../base/annotation.js").Annotation,
        FunctionAnnotation = require("../../base/annotation.js").FunctionAnnotation,
        Context = require("../../base/context.js").Context,
        Types = require("./../../interfaces.js").TYPES,
        Sources = require("./../../interfaces.js").SOURCES;

    var ObjectRegistry = {};

    require("./registry/math.js").register(ObjectRegistry);

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
        transformAAST: function (program) {
            this.root = program;
            var context = new Context(program, null, {name: "global"}),
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
                        case Syntax.MemberExpression:
                            return handleMemberExpression(node, parent, topDeclarations, context);
                        case Syntax.BinaryExpression:
                            return handleBinaryExpression(node, parent);
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
                        case Syntax.ReturnStatement:
                            if(inMain) {
                                return handleReturnInMain(node);
                            }
                            break;
                    }
                },

                leave: function(node, parent) {
                    switch(node.type) {
                        case Syntax.FunctionDeclaration:
                            context = contextStack.pop();
                            inMain = context.str() == mainId;
                            if (inMain)
                                return handleMainFunction(node, parent, context);
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
            property = memberExpression.property;


        var objectReference = context.getBindingByName(object.name);

        if (objectReference in ObjectRegistry) {
            var objectEntry = ObjectRegistry[object.name];
            if (property.name in objectEntry) {
                var propertyHandler = objectEntry[property.name];
                if (typeof propertyHandler == "function") {
                    return propertyHandler(memberExpression, parent, cb);
                }
            }
        }
        var exp = new Annotation(memberExpression);
        if(objectReference.isGlobal()) {
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
        if (binaryExpression.operator == "%") {
            return handleModulo(binaryExpression);
        }
        return binaryExpression;
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
                binaryExpression.right // TODO: Needs to be number type
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

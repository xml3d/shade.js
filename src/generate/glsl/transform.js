(function (ns) {

    var Base = require("../../base/index.js"),
        common = require("../../base/common.js"),
        FunctionAnnotation = require("../../base/annotation.js").FunctionAnnotation,
        Shade = require("./../../interfaces.js"),
        Types = Shade.TYPES,
        Kinds = Shade.OBJECT_KINDS,
        Tools = require('./registry/tools.js'),
        System = require('./registry/system.js'),
        assert = require('assert');


    var Context = require("./registry/").GLTransformContext;


    var walk = require('estraverse');
    var Syntax = walk.Syntax;
    var ANNO = common.ANNO;


    /**
     * Transforms the JS AST to an AST representation convenient
     * for code generation
     * @constructor
     */
    var GLASTTransformer = function (root, mainId, opt) {
        this.context = new Context(root, mainId, opt);
    };

    Base.extend(GLASTTransformer.prototype, {
        /**
         *
         * @param {GLTransformScope} scope
         */
        registerThisObject: function (scope) {
            var thisObject = scope.getBindingByName("this");
            if (thisObject && thisObject.isObject()) {
                var properties = thisObject.getNodeInfo();
                for (var name in properties) {
                    var prop = ANNO({}, properties[name]);
                    if (!prop.isDerived())
                        this.context.blockedNames.push(Tools.getNameForSystem(name));
                }
                for (var property in System.derivedParameters) {
                    if(properties.hasOwnProperty(property)) {
                        Base.deepExtend(properties[property], System.derivedParameters[property]);
                    }
                }
                Base.extend(this.context.systemParameters, properties);
            }
        },


        createUniformSetterFunction: function (parameters) {
            return function (envNames, sysNames, inputCollection, cb) {
                var i, base, override, srcName, destName;
                if (envNames && inputCollection.envBase) {
                    i = envNames.length;
                    base = inputCollection.envBase;
                    override = inputCollection.envOverride;
                    while (i--) {
                        srcName = envNames[i];
                        destName = Tools.getNameForGlobal(envNames[i]);
                        cb(destName, override && override[srcName] !== undefined ? override[srcName] : base[srcName]);
                        if (parameters.shader[destName].kind === Shade.OBJECT_KINDS.TEXTURE) {
                            cb(destName + "_width", override && override[srcName] !== undefined ? override[srcName].width : base[srcName][0].width);
                            cb(destName + "_height", override && override[srcName] !== undefined ? override[srcName].height : base[srcName][0].height)
                        }
                    }
                }
                if (sysNames && inputCollection.sysBase) {
                    i = sysNames.length;
                    base = inputCollection.sysBase;
                    while (i--) {
                        srcName = sysNames[i];
                        destName = Tools.getNameForSystem(sysNames[i]);
                        cb(destName, base[srcName]);
                    }
                }
            }

        },

        transform: function () {
            var context = this.context,
                program = context.root,
                scope = context.createScope(this.context.root, null, "global"),
                name, declaration;

            scope.registerGlobals();
            context.pushScope(scope);

            this.registerThisObject(scope);

            // TODO: We should also block systemParameters here. We can block all system names, even if not used.
            for(name in context.globalParameters){
                context.blockedNames.push( Tools.getNameForGlobal(name) );
            }

            this.replace(program);

            var usedParameters = context.usedParameters;
            for(name in usedParameters.shader){
                declaration = createTopDeclaration(name, usedParameters.shader[name]);
                declaration && program.body.unshift(declaration);
            }

            for(name in usedParameters.system){
                declaration = createTopDeclaration(name, usedParameters.system[name]);
                declaration && program.body.unshift(declaration);
            }

            var uniformSetter = this.createUniformSetterFunction(usedParameters);

            var userData = ANNO(program).getUserData();
            userData.internalFunctions = context.internalFunctions;

            return { program: program, uniformSetter: uniformSetter, headers: context.headers};
        },
        /**
         *
         * @param {Object!} ast
         * @returns {*}
         */
        replace: function(ast) {
            var controller = new walk.Controller(),
                context = this.context;

            ast = controller.replace(ast, {

                enter: function (node, parent) {
                    //console.log("Enter:", node.type);
                    switch (node.type) {
                        case Syntax.Identifier:
                            return enterIdentifier(node, parent, context);
                        case Syntax.IfStatement:
                            return enterIfStatement(node);
                        case Syntax.FunctionDeclaration:
                            return enterFunctionDeclaration(node, context);
                    }
                },

                leave: function(node, parent) {
                    switch(node.type) {
                        case Syntax.MemberExpression:
                            return leaveMemberExpression(node, parent, context);
                        case Syntax.NewExpression:
                            return leaveNewExpression(node, context);
                        case Syntax.LogicalExpression:
                            return leaveLogicalExpression(node);
                        case Syntax.CallExpression:
                            return leaveCallExpression(node, parent, context);
                        case Syntax.UnaryExpression:
                            return leaveUnaryExpression(node);
                        case Syntax.FunctionDeclaration:
                            return leaveFunctionDeclaration(node, context);
                        case Syntax.ReturnStatement:
                            return leaveReturnStatement(node, context);
                        case Syntax.BinaryExpression:
                            return handleBinaryExpression(node, parent, context);

                    }
                }
            });
            return ast;
        }
    });

    /**
     * @param {string} name
     * @param {object} typeInfo
     * @returns {*}
     */
    var createTopDeclaration = function(name, typeInfo){
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
    };

    var enterIdentifier = function(node, parent, state){
        var blockedNames = state.blockedNames;
        var idNameMap = state.idNameMap;

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
    };


    /**
     * Transform a !number expression into an binary expression, number == 0
     * @param node
     * @returns {*}
     */
    var leaveUnaryExpression = function(node) {
        if(node.operator == "!") {
            var argument = ANNO(node.argument);
            //noinspection FallthroughInSwitchStatementJS
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
                    };
                    break;
            }
        }
    };

    /**
     * A return in the main functions sets gl_FragColor or discard if the
     * main method returns without argument
     * @param node
     * @param {GLTransformContext} context
     * @returns {*}
     */
    var leaveReturnStatement = function(node, context) {
        var scope = context.getScope(), fragColors;

        if(!context.inMainFunction())
            return;

        if (node.argument) {
            var argument = ANNO(node.argument);
            if (argument.isArray()) {
               fragColors = {type: Syntax.BlockStatement, body: []};
               node.argument.elements.forEach(function(element, index) {
                    fragColors.body.push(createGLFragColor(Tools.castToVec4(element, scope), index));
               });
            } else {
                fragColors = createGLFragColor(Tools.castToVec4(node.argument, scope));
            }
            return {
                type: Syntax.BlockStatement,
                body: [ fragColors, { type: Syntax.ReturnStatement } ]
            };

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

    /**
     * Transform the main function into a GLSL conform main function
     * with signature 'void main(void)'
     * @param node
     */
    var leaveMainFunction = function(node) {
        var anno = new FunctionAnnotation(node);
        anno.setReturnInfo({ type: Types.UNDEFINED });

        // Main has no parameters
        node.params = [];
        // Rename to 'main'
        node.id.name = "main";
        //console.log(node);
    };

    function createGLFragColor(result, index) {
        return {
            type: Syntax.AssignmentExpression,
            operator: "=",
            left: {
                type: Syntax.Identifier,
                name: "gl_FragColor" + (index !== undefined ? "[" + index + "]" : "")
            },
            right: result
        };
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
    }

    /**
     *
     * @param {object} node
     * @param {object} parent
     * @param {GLTransformContext} context
     * @returns {*}
     */
    var leaveCallExpression = function (node, parent, context) {
        var scope = context.getScope();

        /** Filter out undefined arguments, we do the same for the declaration */
        node.arguments = node.arguments.filter(function(a) { return !ANNO(a).isUndefined()});

        // Is this a call on an object?
        if (node.callee.type == Syntax.MemberExpression) {
            var calleeReference = common.getTypeInfo(node.callee, scope);
            if(!(calleeReference && calleeReference.isFunction()))
                Shade.throwError(node, "Something went wrong in type inference, " + node.callee.object.name);

            var object = node.callee.object,
                propertyName = node.callee.property.name;

            var objectReference = common.getTypeInfo(object, scope);
            if(!objectReference)  {
                Shade.throwError(node, "Internal: No type info for: " + object);
            }

            var objectInfo = scope.getObjectInfoFor(objectReference);
            if(!objectInfo) { // Every object needs an info, otherwise we did something wrong
                Shade.throwError(node, "Internal Error: No object registered for: " + objectReference.getTypeString() + ", " + getNameOfNode(node.callee.object)+", "+node.callee.object.type);
            }
            if (objectInfo.hasOwnProperty(propertyName)) {
                var propertyHandler = objectInfo[propertyName];
                if (typeof propertyHandler.callExp == "function") {
                    var args = common.createTypeInfo(node.arguments, scope);
                    return propertyHandler.callExp(node, args, parent, context);
                }
            }
        }
    };

    var leaveNewExpression = function(newExpression, context){
        var scope = context.getScope();
        var entry = scope.getBindingByName(newExpression.callee.name);
        //console.error(entry);
        if (entry && entry.hasConstructor()) {
            var constructor = entry.getConstructor();
            return constructor(newExpression);
        }
       else {
            throw new Error("ReferenceError: " + newExpression.callee.name + " is not defined");
        }
    };


    /**
     *
     * @param {object} node
     * @param {object} parent
     * @param {GLTransformContext} context
     * @returns {*}
     */
    var leaveMemberExpression = function (node, parent, context) {
        var propertyName = node.property.name,
            scope = context.getScope(),
            parameterName,
            propertyLiteral;

        if (node.computed) {
            return handleComputedMemberExpression(node, parent, context);
        }

        var objectReference = common.getTypeInfo(node.object, scope);

        if (!objectReference || !objectReference.isObject())
            Shade.throwError(node, "Internal Error: Object of Member expression is no object.");

        var objectInfo = scope.getObjectInfoFor(objectReference);
        if(!objectInfo) {// Every object needs an info, otherwise we did something wrong
            Shade.throwError(node, "Internal Error: No object registered for: " + objectReference.getTypeString() + JSON.stringify(node.object));
        }
        if (!objectInfo.hasOwnProperty(propertyName))
            Shade.throwError(node, "Internal Error: Object of type " + objectReference.getTypeString() + " has no property '" + propertyName +"'");

        var propertyHandler = objectInfo[propertyName];
        if (typeof propertyHandler.property == "function") {
            return propertyHandler.property(node, parent, scope, context);
        }

        var usedParameters = context.usedParameters;
        if(objectReference.isGlobal()) {
            parameterName = Tools.getNameForGlobal(propertyName);
            if(!usedParameters.shader.hasOwnProperty(parameterName)) {
                usedParameters.shader[parameterName] = context.globalParameters[propertyName];
            }

            propertyLiteral =  { type: Syntax.Identifier, name: parameterName};
            ANNO(propertyLiteral).copy(ANNO(node));
            return propertyLiteral;
        }
        if (node.object.type == Syntax.ThisExpression) {
            parameterName = Tools.getNameForSystem(propertyName);
            if(!usedParameters.system.hasOwnProperty(parameterName)) {
                usedParameters.system[parameterName] = context.systemParameters[propertyName];
            }

            propertyLiteral =  { type: Syntax.Identifier, name: parameterName};
            ANNO(propertyLiteral).copy(ANNO(node));
            return propertyLiteral;
        }

    };

    /**
     * @param {object} node
     * @param {object} parent
     * @param {GLASTTransformer} context
     */
    var handleComputedMemberExpression = function(node, parent, context) {
        var objectReference = context.getTypeInfo(node.object);
        if (!objectReference.isArray()) {
            Shade.throwError(node, "In shade.js, [] access is only allowed on arrays.");
        }
    };


    /**
     * @param {object} node
     * @param {object} parent
     * @param {GLASTTransformer} context
     */
    var handleBinaryExpression = function (node, parent, context) {
        // In GL, we can't mix up floats, ints and bool for binary expressions
        var left = context.getTypeInfo(node.left),
            right = context.getTypeInfo(node.right);

        if (left.isNumber() && right.isInt()) {
            node.right = Tools.castToFloat(node.right);
        }
        else if (right.isNumber() && left.isInt()) {
            node.left = Tools.castToFloat(node.left);
        }

        if (node.operator == "%") {
            return handleModulo(node);
        }
        return node;
    };

    /*function castToInt(ast, force) {
        var exp = ANNO(ast);

        if (!exp.isInt() || force) {   // Cast
            return {
                type: Syntax.CallExpression,
                callee: {
                    type: Syntax.Identifier,
                    name: "int"
                },
                arguments: [ast]
            };
        }
        return ast;
    };*/



    /**
     * Transform % operator of JavaScript into a mod function in GLSL
     * @param node
     */
    var handleModulo = function (node) {
        node.right = Tools.castToFloat(node.right);
        node.left = Tools.castToFloat(node.left);
        return {
            type: Syntax.CallExpression,
            callee: {
                type: Syntax.Identifier,
                name: "mod"
            },
            arguments: [
                node.left,
                node.right
            ],
            extra: {
                type: Types.NUMBER
            }
        }
    };

    /**
     * @param {Object} node
     * @param {GLTransformContext} context
     * @returns {*}
     */
    var enterFunctionDeclaration = function(node, context) {
        var scope = context.createScope(node, context.getScope(), node.id.name);
        context.pushScope(scope);

        // Remove parameters of type undefined (these are not used anyway)
        node.params = node.params.filter(function(a) { return !ANNO(a).isUndefined()});
        return node;
    };

    /**
     * @param {Object} node
     * @param {GLTransformContext} context
     * @returns {*}
     */
    var leaveFunctionDeclaration = function(node, context) {
        var wasMain = context.inMainFunction();
        context.popScope();
        if (wasMain)
            return leaveMainFunction(node);
    };


    var enterIfStatement = function (node) {
        var test = ANNO(node.test);

       assert(!test.hasStaticValue(), "Static value in IfStatement test");
       assert(!test.isObject(), "Object in IfStatement test");

       //noinspection FallthroughInSwitchStatementJS
        switch(test.getType()) {
           // Transform 'if(number)' into 'if(number != 0)'
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
               };
               break;
       }
    };

    /**
     * Need to transform truth expressions in real boolean expression, because something like if(0) is
     * not allowed in GLSL
     *
     * @param node
     * @returns {*}
     */
    var leaveLogicalExpression = function(node) {
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
            };
        }
    };


    // Exports
    ns.GLASTTransformer = GLASTTransformer;


}(exports));

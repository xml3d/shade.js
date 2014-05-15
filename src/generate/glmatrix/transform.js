(function (ns) {

    var Base = require("../../base/index.js"),
        common = require("../../base/common.js"),
        Shade = require("./../../interfaces.js"),
        Types = Shade.TYPES,
        Kinds = Shade.OBJECT_KINDS,
        analyses = require('analyses'),
        Tools = require('../tools.js'),
        assert = require('assert');


    var walk = require('estraverse');
    var Syntax = walk.Syntax;
    var ANNO = common.ANNO;
    var Map = common.Map;
    var Set = analyses.Set;


    /**
     * Transforms the JS AST to an AST representation convenient
     * for code generation
     * @constructor
     */
    var GLMatrixTransformer = function () {

    };

    Base.extend(GLMatrixTransformer.prototype, {

        transform: function (aast) {

            return this.replace(aast);
        },
        /**
         *
         * @param {Object!} ast
         * @returns {*}
         */
        replace: function(aast) {
            var controller = new walk.Controller();

            return controller.replace(aast, {

                enter: function (node, parent) {

                },

                leave: function(node, parent) {
                    switch(node.type) {
                        case Syntax.VariableDeclarator:
                            return leaveVariableDeclarator(node, parent);
                        case Syntax.CallExpression:
                            return leaveCallExpression(node, parent);
                        case Syntax.AssignmentExpression:
                            return leaveAssignmentExpression(node);
                    }
                }
            });
        }
    });

    function leaveVariableDeclarator(node, parent){
        var nodeAnno = ANNO(node);

        var glObject = getGlMatrixObject(nodeAnno.getKind());
        if(glObject){
            node.init = getCallExpression(glObject, "create", []);
            return node;
        }
    }

    function leaveCallExpression(node, parent){
        if(node.callee.type != Syntax.MemberExpression)
            return;
        var nodeAnno = ANNO(node);
        var objectAnno = ANNO(node.callee.object);
        var methodName = node.callee.property.name;

        var glObject = getGlMatrixObject(objectAnno.getKind());
        if(nodeAnno.getType() != Types.OBJECT && glObject){
            var glMethodName = getScalarGlMethodName(glObject, methodName);
            var arguments = [node.callee.object];
            arguments.push.apply(arguments, node.arguments);
            return getCallExpression(glObject, glMethodName, arguments);
        }
    }

    function leaveAssignmentExpression(node, parent){
        var destAnno = ANNO(node.left);
        if(destAnno.getType() != Types.OBJECT) return;

        if(node.right.type == Syntax.NewExpression){
            return leaveAssignmentNew(node, parent);
        }
        else if(node.right.type == Syntax.CallExpression
                && node.right.callee.type == Syntax.MemberExpression &&
                getGlMatrixObject(ANNO(node.right.callee.object).getKind())){
            return leaveAssignmentCall(node, parent);
        }
        else{
            return leaveAssignmentCopy(node, parent);
        }

    }

    function leaveAssignmentNew(node, parent){
        var destAnno = ANNO(node.left);
        var glObject = getGlMatrixObject(destAnno.getKind());

        var arguments = [node.left];

        var nodeArgs = node.right.arguments;
        for(var i = 0; i < nodeArgs,length; ++i){
            pushArgComponents(arguments, nodeArgs[i]);
        }
        return getCallExpression(glObject, "set", arguments);

    }

    function leaveAssignmentCall(node, parent){
        var objectAnno = ANNO(node.right.callee.object);
        var glObject = getGlMatrixObject(objectAnno.getKind());
        var methodName = node.right.callee.property;

        var arguments = [node.left];
        arguments.push.apply(arguments, node.right.arguments);
        var method = getObjectGlMethodName(glObject, methodName);
        return getCallExpression(glObject, methodName, arguments);

    }

    function leaveAssignmentCopy(node, parent){
        var destAnno = ANNO(node.left);
        var glObject = getGlMatrixObject(destAnno.getKind());

        var arguments = [node.left, node.right];
        return getCallExpression(glObject, "copy", arguments);
    }


    function pushArgComponents(dest, arg){
        var components = getComponents(ANNO(arg));
        if(components == 1){
            dest.push(arg);
            return;
        }
        for(var i = 0; i < components; ++i){
            dest.push(getArrayAccessAst(arg, i));
        }
    }



    function getComponents(anno){
        var type = anno.getType(), kind = anno.getKind();
        if(type == Types.NUMBER || type == Types.INT)
            return 1;
        switch(kind){
            case Kinds.FLOAT2: return 2;
            case Kinds.FLOAT3: return 3;
            case Kinds.FLOAT4: return 4;
            case Kinds.MATRIX3: return 9;
            case Kinds.MATRIX4: return 16;
        }
    }

    function getGlMatrixObject(kind){
        switch(kind){
            case Kinds.FLOAT2: return "vec2";
            case Kinds.FLOAT3: return "vec3";
            case Kinds.FLOAT4: return "vec4";
            case Kinds.MATRIX3: return "mat3";
            case Kinds.MATRIX4: return "mat4";
        }
        return null;
    }

    function getMemberExpression(objectName, propertyName ){
        return {type: Syntax.MemberExpression, object: {type: Syntax.Identifier, name: objectName},
                    property: {type: Syntax.Identifier, name: propertyName}
                }
    }
    function getCallExpression(objectName, propertyName, arguments ){
        return { type: Syntax.CallExpression,
            callee: getMemberExpression(objectName, propertyName),
            arguments: arguments
        };
    }

    function getArrayAccessAst(object, index){
        return {type: Syntax.MemberExpression, object: object, computed: true,
             property: {type: Syntax.Literal, value: index, raw: index}};
    }





    function getScalarGlMethodName(glObject, methodName){
        switch(methodName){
            case "dot": return "dot";
            case "length" : return "length";
        }
        throw new Error("Unknown glMatrix method with scalar output: '" + methodName + "'");
    }

    function getObjectGlMethodName(glObject, methodName){
        switch(methodName){
            case "add": return "add";
            case "sub": return "sub";
            case "mul": return "mul";
            case "div": return "div";
            case "max": return "max";
            case "min" : return "min";
            case "length": return "setLength";
        }
        throw new Error("Unknown glMatrix method with object output: '" + methodName + "'");
    }


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
               context.addHeader("#extension GL_EXT_draw_buffers : require");
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
                name: (index !== undefined ? "gl_FragData[" + index + "]" : "gl_FragColor")
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

        if(ANNO(node).isUniformExpression()) {
            var uexp = handleUniformExpression(node, context);
            if(uexp)
                return uexp;
        }

        var objectReference = common.getTypeInfo(node.object, scope);

        if (!objectReference || !objectReference.isObject()) {
            Shade.throwError(node, "Internal Error: Object of Member expression is no object.");
        }


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
            return Tools.binaryExpression2FunctionCall(node, "mod");
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
     * @param {Object} node
     * @param {GLTransformContext} context
     * @returns {*}
     */
    var enterFunctionDeclaration = function(node, context) {
        var scope = context.createScope(node, context.getScope(), node.id.name);
        context.pushScope(scope);

        var newParameterList = [];
        // Remove parameters of type undefined (these are not used anyway)
        node.params.forEach(function(a) {
            // Don't declare undefined parameters
            if(!ANNO(a).isUndefined()){
                newParameterList.push(a);
            } else {
                var binding = scope.getBindingByName(a.name);
                if(!binding.isUndefined()) {
                    addDeclaration(a.name, binding, node.body);
                }
            }
        });
        node.params = newParameterList;
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


    function handleUniformExpression(node, context) {
            var exp = ANNO(node),
                extra;

            if (exp.isUniformExpression() && !(exp.getSource() == Shade.SOURCES.UNIFORM)) {
                var uniformName = node.property.name;

                if (context.usedParameters.uexp.hasOwnProperty(uniformName)) { // Reuse
                    extra = context.usedParameters.uexp[uniformName];
                    return {
                        type: Syntax.Identifier,
                        name: uniformName,
                        extra: extra
                    }
                }

                // Generate new uniform expression
                extra = {};

                if(!context.uniformExpressions.hasOwnProperty(uniformName)) {
                    throw new Error("Internal: No information about uniform expression available: " + Shade.toJavaScript(node));
                }
                extra.setter = generateUniformSetter(exp, context.uniformExpressions[uniformName]);

                //console.log(uniformName, extra.setter);

                extra.type = exp.getType();
                if (exp.isObject()) {
                    extra.kind = exp.getKind();
                }
                extra.source = Shade.SOURCES.UNIFORM;
                extra.dependencies = exp.getUniformDependencies();

                context.usedParameters.uexp[uniformName] = extra;

                return {
                    type: Syntax.Identifier,
                    name: uniformName,
                    extra: extra
                }
            }
        }

    function generateUniformSetter(uniformAnno, expressionInfo) {
        var code = expressionInfo.code;
        if(uniformAnno.isObject())
            code = "(" + expressionInfo.code + ")._toFloatArray()";
        var source = "return " + code + ";";
        return new Function("env", source);
    }

    function addDeclaration(name, typeInfo, target) {
        var targetContainer, declaration;
        switch (target.type) {
            case Syntax.BlockStatement:
                targetContainer = target.body;
                break;
            default:
                throw new Error("Internal: addDeclaration to " + target.type);
        }
        if (targetContainer.length && targetContainer[0].type == Syntax.VariableDeclaration) {
           declaration = targetContainer[0];
           //console.log(declaration.declarations.push(declaration.declarations[0]));
        } else {
            declaration = {
                type: Syntax.VariableDeclaration,
                kind: "var",
                declarations: []
            }
            targetContainer.unshift(declaration);
        }
        var declarator = {
            type: Syntax.VariableDeclarator,
            id: {
                type: Syntax.Identifier,
                name: name
            },
            init: null
        };
        ANNO(declarator).copy(typeInfo);
        declaration.declarations.push(declarator);
    }


    // Exports
    ns.GLMatrixTransformer = GLMatrixTransformer;


}(exports));

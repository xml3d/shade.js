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
        var destAnno = ANNO(node);
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
        var destAnno = ANNO(node);
        var glObject = getGlMatrixObject(destAnno.getKind());

        var arguments = [node.left];

        var nodeArgs = node.right.arguments;
        for(var i = 0; i < nodeArgs.length; ++i){
            pushArgComponents(arguments, nodeArgs[i]);
        }
        if(arguments.length == 1){
            arguments.push({
                type: Syntax.Literal,
                value: 0,
                raw: "0"
            })
        }
        var expectedArgLength = 1 + getComponents(destAnno);


        while(arguments.length < expectedArgLength){
            arguments.push(Base.deepExtend({},arguments[arguments.length-1]));
        }

        return getCallExpression(glObject, "set", arguments);

    }

    function leaveAssignmentCall(node, parent){
        var objectAnno = ANNO(node.right.callee.object);
        var glObject = getGlMatrixObject(objectAnno.getKind());
        var methodName = node.right.callee.property.name;

        var arguments = [node.left, node.right.callee.object];
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

    // Exports
    ns.GLMatrixTransformer = GLMatrixTransformer;


}(exports));

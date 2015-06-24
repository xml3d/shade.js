(function (ns) {

    var Syntax = require('estraverse').Syntax;
    var Base = require("../base/index.js");
    var ANNO = require("../base/annotation.js").ANNO;
    var TypeInfo = require("../type-system/typeinfo.js").TypeInfo;
    var Shade = require("../interfaces.js");
    var VecBase = require("../base/vec.js");

    var TYPES = Shade.TYPES,
        KINDS = Shade.OBJECT_KINDS;



    ns.removeMemberFromExpression = function (node) {
        return {
            type: Syntax.Identifier,
            name: node.property.name
        }
    }

    ns.generateFreeName = function(name, blockedNames){
        var newName = name.replace(/_+/g, "_"), i = 1;
        while(blockedNames.indexOf(newName) != -1){
            newName = (name + "_" + (++i)).replace(/_+/g, "_");
        }
        blockedNames.push(newName);
        return newName;
    }

    ns.getInternalFunctionName = function(state, key, type, details){
        if(!state.internalFunctions[key]){
            var name = ns.generateFreeName(key, state.blockedNames);
            state.internalFunctions[key] = {
                name: name,
                type: type,
                details: details
            };
        }
        return state.internalFunctions[key].name;
    };


    ns.binaryExpression2FunctionCall = function(node, name) {
        node.right = ns.castToFloat(node.right);
        node.left = ns.castToFloat(node.left);
        return {
            type: Syntax.CallExpression,
            callee: {
                type: Syntax.Identifier,
                name: name
            },
            arguments: [
                node.left,
                node.right
            ],
            extra: {
                type: TYPES.NUMBER
            }
        }
    };

    var Vec = {
        getVecArgs: function(args){
            if(args.length == 0){
                var result = [
                    {
                        type: "Literal",
                        value: "0"
                    }
                ];
                ANNO(result[0]).setType(TYPES.NUMBER);
                return result;
            }
            else{
                return args;
            }
        },

        generateVecFromArgs: function(vecCount, args){
            if(vecCount == 1)
                return args[0];
            if(args.length == 0){
                args = Vec.getVecArgs(args);
            }

            if(args.length == 1 && ANNO(args[0]).isOfKind(KINDS['FLOAT' + vecCount]))
                return args[0];
            var result = {
                type: Syntax.NewExpression,
                callee: {
                    type: Syntax.Identifier,
                    name: "Vec" + vecCount
                },
                arguments: args
            };
            ANNO(result).setType(TYPES.OBJECT, KINDS['FLOAT' + vecCount]);
            ANNO(result.callee).setType(TYPES.FUNCTION);
            return result;
        },

        createSwizzle: function(vecCount, swizzle, node, args, parent){
            if (args.length == 0) {
                node.callee.extra = node.extra;
                return node.callee;
            }
            var singular = swizzle.length == 1;
            var argObject = singular ? node.arguments[0] : Vec.generateVecFromArgs(swizzle.length, node.arguments);
            var replace = {
                type: Syntax.NewExpression,
                callee: {
                   type: Syntax.Identifier,
                   name: "Vec" + vecCount
                },
                arguments: []
            };
            var indices = [];
            for(var i = 0; i < swizzle.length; ++i){
                var idx = VecBase.swizzleToIndex(swizzle.charAt(i));
                indices[idx] = i;
            }
            for(var i = 0; i < vecCount; ++i){
                if(indices[i] !== undefined){
                    replace.arguments[i] = singular ? argObject : {
                        type: Syntax.MemberExpression,
                        object: argObject,
                        property: {
                            type: Syntax.Identifier,
                            name: VecBase.indexToSwizzle(indices[i])
                        }
                    };
                }
                else{
                   replace.arguments[i] = {
                        type: Syntax.MemberExpression,
                        object: node.callee.object,
                        property: {
                            type: Syntax.Identifier,
                            name: VecBase.indexToSwizzle(i)
                        }
                    };
                }
            }
            ANNO(replace).copy(ANNO(node));
            return replace;
        },
        createSwizzleOperator: function(vecCount, swizzle, operator, node, args, parent){
            var singular = swizzle.length == 1;
            var argObject = singular ? node.arguments[0] : Vec.generateVecFromArgs(swizzle.length, node.arguments);
            var replace = {
                type: Syntax.NewExpression,
                callee: {
                   type: Syntax.Identifier,
                   name: "Vec" + vecCount
                },
                arguments: []
            };
            var indices = [];
            for(var i = 0; i < swizzle.length; ++i){
                var idx = VecBase.swizzleToIndex(swizzle.charAt(i));
                indices[idx] = i;
            }
            for(var i = 0; i < vecCount; ++i){
                var thisValue = {
                    type: Syntax.MemberExpression,
                    object: node.callee.object,
                    property: {
                        type: Syntax.Identifier,
                        name: VecBase.indexToSwizzle(i)
                    }
                };
                if(indices[i] !== undefined){
                    replace.arguments[i] = {
                        type: Syntax.BinaryExpression,
                        operator: operator,
                        left: thisValue,
                        right: singular ? argObject : {
                            type: Syntax.MemberExpression,
                            object: argObject,
                            property: {
                                type: Syntax.Identifier,
                                name: VecBase.indexToSwizzle(indices[i])
                            }
                        }
                    }
                }
                else{
                   replace.arguments[i] = thisValue
                }
            }
            ANNO(replace).copy(ANNO(node));
            return replace;
        },

        attachSwizzles: function (instance, vecCount, callExp, callOperatorExp){
            for(var s = 0; s < VecBase.swizzleSets.length; ++s){
                for(var count = 1; count <= 4; ++count){
                    var max = Math.pow(vecCount, count);
                     for(var i = 0; i < max; ++i){
                        var val = i;
                        var key = "";
                        var indices = [], withSetter = (count <= vecCount);
                        for(var  j = 0; j < count; ++j){
                            var idx = val % vecCount;
                            val = Math.floor(val / vecCount);
                            key+= VecBase.swizzleSets[s][idx];
                            if(indices[idx])
                                withSetter = false;
                            else
                                indices[idx] = true;
                        }
                        instance[key] = {
                            callExp: callExp.bind(null, vecCount, key)
                        };
                        if(withSetter && callOperatorExp){
                            for(var operator in VecBase.swizzleOperators){
                                var opSymbol = VecBase.swizzleOperators[operator];
                                instance[key + operator] = {
                                    callExp: callOperatorExp.bind(null, vecCount, key, opSymbol)
                                };
                            }
                        }
                    }
                }
            }
        },

        createOperator: function(vecCount, operator, node, args, parent) {
            var other = Vec.generateVecFromArgs(vecCount, node.arguments);
            var replace = {
                type: Syntax.BinaryExpression,
                operator: operator,
                left: node.callee.object,
                right: other
            };
            ANNO(replace).copy(ANNO(node));
            return replace;
        },

        attachOperators: function(instance, vecCount, operators){
            for(var name in operators){
                var operator = operators[name];
                instance[name] = {
                    callExp: Vec.createOperator.bind(null, vecCount, operator)
                }
            }
        },

        createFunctionCall: function(functionName, secondVecSize, node, args, parent) {
            var replace = {
                type: Syntax.CallExpression,
                callee: {
                    type: Syntax.Identifier,
                    name: functionName
                },
                arguments: [
                    node.callee.object
                ]
            };
            if(secondVecSize){
                var other = Vec.generateVecFromArgs(secondVecSize, node.arguments);
                replace.arguments.push(other);
            }
            ANNO(replace).copy(ANNO(node));
            return replace;
        },

        generateLengthCall: function(node, args, parent){
            if(args.length == 0){
                return Vec.createFunctionCall('length', 0, node, args, parent);
            }
            else{
                 var replace = {
                    type: Syntax.BinaryExpression,
                    operator: '*',
                    left: node.callee.object,
                    right: {
                        type: Syntax.BinaryExpression,
                        operator: '/',
                        left: node.arguments[0],
                        right: Vec.createFunctionCall('length', 0, node, args, parent)
                    }
                };
                ANNO(replace.right).setType(TYPES.NUMBER);
                ANNO(replace).copy(ANNO(node));
                return replace;
            }
        },

        generateConstructor: function(node){
            node.arguments = Vec.getVecArgs(node.arguments);
        }
    };

    var Mat = {
        TYPES: {
            "Mat3" : {kind: KINDS.MATRIX3, colKind: KINDS.FLOAT3, colCount: 3, glslType: "mat3"},
            "Mat4" : {kind: KINDS.MATRIX4, colKind: KINDS.FLOAT4, colCount: 4, glslType: "mat3"}
        },

        generateMatFromArgs: function(matName, args){
            if(args.length == 0){
                args = Vec.getVecArgs(args);
            }

            if(args.length == 1 && ANNO(args[0]).isOfKind( Mat.TYPES[matName].kind))
                return args[0];
            var result = {
                type: Syntax.NewExpression,
                callee: {
                    type: Syntax.Identifier,
                    name: matName
                },
                arguments: args
            };
            ANNO(result).setType(TYPES.OBJECT, Mat.TYPES[matName].kind);
            ANNO(result.callee).setType(TYPES.FUNCTION);
            return result;
        },

        createOperator: function(matName, operator, node, args, parent) {
            var other = Mat.generateMatFromArgs(matName, node.arguments);
            var replace = {
                type: Syntax.BinaryExpression,
                operator: operator,
                left: node.callee.object,
                right: other
            };
            ANNO(replace).copy(ANNO(node));
            return replace;
        },

        attachOperators: function(instance, matName, operators){
            for(var name in operators){
                var operator = operators[name];
                instance[name] = {
                    callExp: Mat.createOperator.bind(null, matName, operator)
                }
            }
        },

        generateColCall: function(matName, node, args, parent, state){
            var memberAccess = {
                type: Syntax.MemberExpression,
                object: node.callee.object,
                property: node.arguments[0],
                computed: true
            };
            ANNO(memberAccess).setType(TYPES.OBJECT, Mat.TYPES[matName].colKind);

            if(args.length == 1){
                return memberAccess;
            }
            else{
                var methodKey = "_" + matName + "_col";
                var methodName = ns.getInternalFunctionName(state, methodKey,
                    "MatCol", {colType: "vec" + Mat.TYPES[matName].colCount, matType: Mat.TYPES[matName].glslType});

                 var replace = {
                    type: Syntax.CallExpression,
                    callee: {type: Syntax.Identifier, name: methodName},
                    arguments: [
                        node.callee.object,
                        node.arguments[0],
                        node.arguments[1]
                    ]
                };
                ANNO(replace).copy(ANNO(node));
                return replace;
            }
        }

    }


    ns.Vec = Vec;
    ns.Mat = Mat;

    ns.castToFloat = function (ast) {
        var exp = ANNO(ast);

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

    ns.getNameForSystem = function(baseName) {
        return baseName;
    }

    ns.getNameForGlobal = function(baseName) {
        var name = "_env_" + baseName;
        return name.replace(/_+/g, "_");
    }

    /**
     * @param {Object} node
     * @param  {GLTransformContext} context
     * @returns {*}
     */
    ns.castToVec4 = function (node, context) {
        var exp = TypeInfo.createForContext(node, context);

        if (exp.isOfKind(KINDS.FLOAT4) || exp.isOfKind(KINDS.COLOR_CLOSURE))
            return node;

        if (exp.isOfKind(KINDS.FLOAT3)) {
            return {
                type: Syntax.CallExpression,
                callee: {
                    type: Syntax.Identifier,
                    name: "vec4"
                },
                arguments: [node, { type: Syntax.Literal, value: 1.0, extra: { type: TYPES.NUMBER} }]
            }
        }
        Shade.throwError(node, "Can't cast from '" + exp.getTypeString() + "' to vec4");
    }

    ns.extend = Base.extend;
    ns.createClass = Base.createClass;

}(exports))

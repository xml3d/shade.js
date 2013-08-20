(function (ns) {

    var Syntax = require('estraverse').Syntax;
    var Base = require("../../../base/index.js");
    var ANNO = require("../../../base/annotation.js").ANNO;
    var Shade = require("../../../interfaces.js"),
        TYPES = Shade.TYPES,
        KINDS = Shade.OBJECT_KINDS,
        VecBase = require("../../../base/vec.js");


    ns.removeMemberFromExpression = function (node) {
        return {
            type: Syntax.Identifier,
            name: node.property.name
        }
    }

    var Vec = {
        generateVecFromArgs: function(vecCount, args){
            if(vecCount == 1)
                return args[0];
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

        attachSwizzles: function (instance, vecCount){
            for(var s = 0; s < VecBase.swizzleSets.length; ++s){
                for(var count = 1; count <= 4; ++count){
                    var max = Math.pow(vecCount, count);
                     for(var i = 0; i < max; ++i){
                        var val = i;
                        var key = "";
                        for(var  j = 0; j < count; ++j){
                            var idx = val % vecCount;
                            val = Math.floor(val / vecCount);
                            key+= VecBase.swizzleSets[s][idx];
                        }
                        instance[key] = {
                            callExp: Vec.createSwizzle.bind(null, vecCount, key)
                        };
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
            }
    };
    ns.Vec = Vec;

    ns.extend = Base.extend;


}(exports));

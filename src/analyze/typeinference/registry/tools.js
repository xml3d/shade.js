(function(ns){
    var Base = require("../../../base/index.js");
    var Shade = require("../../../interfaces.js"),
        TYPES = Shade.TYPES,
        KINDS = Shade.OBJECT_KINDS,
        VecBase = require("../../../base/vec.js");

    var allArgumentsAreConstant = function (args) {
        return args.every(function (arg) {
            return arg.hasConstantValue()
        });
    }

    ns.allArgumentsCanNumber = function(args) {
        return args.every(function (arg) {
            return arg.canNumber();
        });
    }

    ns.checkParamCount = function(node, name, allowed, is) {
        if (allowed.indexOf(is) == -1) {
            Shade.throwError(node, "Invalid number of parameters for " + name + ", expected " + allowed.join(" or ") + ", found: " + is);
        }
    }

    ns.singleAccessor = function (name, obj, validArgCounts, staticValueFunction) {
        return {
            type: TYPES.FUNCTION,
            evaluate: function (result, args, ctx, callObject) {
                ns.checkParamCount(result.node, name, validArgCounts, args.length);
                var typeInfo =  args.length ? obj : { type: TYPES.NUMBER };

                if (staticValueFunction && callObject.hasConstantValue() && args.every(function(a) {return a.hasConstantValue(); })) {
                    typeInfo.staticValue = staticValueFunction(callObject.getConstantValue(), args);
                }
                return typeInfo;
            }
        }
    };

    ns.extend = Base.extend;

    var Vec = {
        TYPES: {
            1: { type: TYPES.NUMBER },
            2: { type: TYPES.OBJECT, kind: "Vec2" },
            3: { type: TYPES.OBJECT, kind: "Vec3" },
            4: { type: TYPES.OBJECT, kind: "Vec4" }
        },
        getType: function (destVector) {
            return Vec.TYPES[destVector];
        },
        getConstantValue: function (methodName, result, args, ctx, callObject) {
            if (callObject.hasConstantValue() && allArgumentsAreConstant(args)) {
                var object = callObject.getConstantValue();
                var callArgs = args.map(function (a) {
                    return a.getConstantValue();
                });
                var method = object[methodName];
                if (method) {
                    return method.apply(object, callArgs);
                }
            }
        },
        checkAnyVecArgument: function(astNode, methodName, arg){
            var cnt;

            if(arg.canNumber()) cnt = 1;
            else if(arg.isOfKind("Vec2")) cnt = 2;
            else if(arg.isOfKind("Vec3")) cnt = 3;
            else if(arg.isOfKind("Vec4")) cnt = 4;
            else Shade.throwError(astNode, "Invalid parameter for " + methodName + ", type '" +
                    arg.getTypeString() + "' is not supported");
            return cnt;
        },
        checkVecArguments: function(methodName, vecSize, withEmpty, argStart, result, args){
            withEmpty = (withEmpty || vecSize == 0);
            var allowed = [];
            for(var i = withEmpty ? 0 : 1; i <= vecSize; ++i) allowed.push(i + argStart);
            ns.checkParamCount(result.node, methodName, allowed, args.length);

            if(withEmpty && args.length - argStart == 0)
                return;

            if(args.length - argStart== 1 && args[0].canNumber())
                return;

            var idx = 0;
            for(var i = argStart; idx < vecSize && i < args.length; ++i){
                var arg= args[i], cnt;
                if(arg.canNumber()) cnt = 1;
                else if(arg.isOfKind("Vec2")) cnt = 2;
                else if(arg.isOfKind("Vec3")) cnt = 3;
                else if(arg.isOfKind("Vec4")) cnt = 4;
                else if(arg.isOfKind("Mat3")) cnt = 9;
                else if(arg.isOfKind("Mat4")) cnt = 16;
                else Shade.throwError(result.node, "Invalid parameter for " + methodName + ", type '" + arg.getTypeString() + "' is not supported");
                idx += cnt;
            }

            if(idx < vecSize)
                Shade.throwError(result.node, "Invalid parameters for " + methodName + ", expected " + vecSize + " scalar values, got " + idx);
            else if(i < args.length){
                Shade.throwError(result.node, "Invalid parameters for " + methodName + ", too many parameters");
            }
        },

        vecEvaluate: function(objectName, methodName, destVecSize, srcVecSize, result, args, ctx, callObject){
            console.log("vecEvaluate", objectName, methodName, destVecSize, srcVecSize, args)
            Vec.checkVecArguments(objectName + "." + methodName, srcVecSize, false, 0, result, args);

            var typeInfo = {};
            Base.extend(typeInfo, Vec.getType(destVecSize));

            return typeInfo;
        },
        anyVecArgumentEvaluate: function (methodName, result, args, ctx, callObject) {
            ns.checkParamCount(result.node, methodName, [1], args.length);
            var arg = args[0];

            var typeInfo = {};
            var cnt = Vec.checkAnyVecArgument(result.node, methodName, arg);
            Base.extend(typeInfo, Vec.getType(cnt));

            return typeInfo;
        },

        optionalZeroEvaluate: function(objectName, methodName, destVecSize, zeroDestVecSize, srcVecSize, result, args, ctx, callObject) {
            var qualifiedName = objectName + "." + methodName;
            var typeInfo = {};

            if(args.length == 0){
                Base.extend(typeInfo, Vec.getType(zeroDestVecSize));
            }
            else{
                Vec.checkVecArguments(qualifiedName, srcVecSize, true, 0, result, args);
                Base.extend(typeInfo, Vec.getType(destVecSize));
            }
            return typeInfo;
        },

        swizzleEvaluate: function(objectName, vecSize, swizzle, withSetter, result, args, ctx, callObject) {
            if(withSetter){
                return Vec.optionalZeroEvaluate(objectName, swizzle, vecSize, swizzle.length, swizzle.length,
                    result, args, ctx, callObject);
            }
            else{
                return Vec.vecEvaluate(objectName, swizzle, swizzle.length, 0, result, args, ctx, callObject);
            }
        },
        swizzleOperatorEvaluate: function(objectName, vecSize, swizzle, operator, result, args, ctx, callObject) {
            return Vec.vecEvaluate(objectName, swizzle + operator, vecSize, swizzle.length, result, args, ctx, callObject);
        },
        getSwizzleEvaluate: function(objectName, vecSize, swizzle, withSetter){
            return  {
                type: TYPES.FUNCTION,
                evaluate: Vec.swizzleEvaluate.bind(null, objectName, vecSize, swizzle, withSetter),
                computeStaticValue: Vec.getConstantValue.bind(null, swizzle)
            }
        },
        getSwizzleOperatorEvaluate: function(objectName, vecSize, swizzle, operator){
            return  {
                type: TYPES.FUNCTION,
                evaluate: Vec.swizzleOperatorEvaluate.bind(null, objectName, vecSize, swizzle, operator),
                computeStaticValue: Vec.getConstantValue.bind(null, swizzle + operator)
            }
        },
        attachSwizzles: function (instance, objectName, vecCount){
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
                        instance[key] = Vec.getSwizzleEvaluate(objectName, vecCount, key, withSetter);
                        if(withSetter){
                            for(var operator in VecBase.swizzleOperators){
                                instance[key + operator] = Vec.getSwizzleOperatorEvaluate(objectName, vecCount, key, operator);
                            }
                        }
                    }
                }
            }
        },
        attachVecMethods: function(instance, objectName, destVecSize, srcVecSize, methodNames){
            for(var i = 0; i < methodNames.length; ++i){
                    var methodName = methodNames[i];
                    instance[methodName] = {
                        type: TYPES.FUNCTION,
                        evaluate: Vec.vecEvaluate.bind(null, objectName, methodName, destVecSize, srcVecSize)
                    }
            }
        },

        getConstantValueFromConstructor: function(objectName, args){
            var argArray = [];
            var isStatic = true;
            args.forEach(function (param) {
                isStatic = isStatic && param.hasConstantValue();
                if (isStatic)
                    argArray.push(param.getConstantValue());
            });

            if (isStatic) {
                var v = new Shade[objectName]();
                Shade[objectName].apply(v, argArray);
                return v;
            }
            return undefined;
        },

        constructorEvaluate: function(objectName, vecSize) {
			var constructor = function (result, args) {
				Vec.checkVecArguments(objectName, vecSize, true, 0, result, args);
				var result = Base.extend({}, Vec.getType(vecSize));
				result.constantValue = Vec.getConstantValueFromConstructor(objectName, args);
				return result;
			}
			constructor.proto = {};
			return constructor;
		}


    };

    var Mat = {
        TYPES: {
            "Mat3": { type: { type: TYPES.OBJECT, kind: KINDS.MATRIX3 }, cols: 3, rows: 3 },
            "Mat4": { type: { type: TYPES.OBJECT, kind: KINDS.MATRIX4 }, cols: 4, rows: 4 }
        },
        getType: function(matName){
            return Mat.TYPES[matName].type;
        },
        getVecSize: function(matName){
            return Mat.TYPES[matName].cols * Mat.TYPES[matName].rows;
        },
        checkMatArguments: function(methodName, matName, withEmpty, result, args){
            if(args.length == 1 && (args[0].isOfKind(KINDS.MATRIX3) || args[0].isOfKind(KINDS.MATRIX4)))
                return;

            for(var i = 0; i < args.length; ++i){
                if(args[i].isOfKind(KINDS.MATRIX3) || args[i].isOfKind(KINDS.MATRIX4))
                    Shade.throwError(result.node, "Invalid parameter for " + methodName + ": Constructing Matrix from Matrix can only take one argument");
            }
            Vec.checkVecArguments(methodName, Mat.getVecSize(matName), withEmpty, 0, result, args);
        },

        matEvaluate: function(matName, methodName, result, args, ctx, callObject){
            Mat.checkMatArguments(matName + "." + methodName, matName, false, result, args);

            var typeInfo = {};
            Base.extend(typeInfo, Mat.getType(matName));

            return typeInfo;
        },

        matConstructorEvaluate: function(matName, result, args, ctx){
            Mat.checkMatArguments(matName, matName, true, result, args);
            return Vec.getConstructorTypeInfo(matName, Mat.getVecSize(matName), Mat.getType(matName), result, args);
        },

        attachMatMethods: function(instance, matName, methodNames){
            for(var i = 0; i < methodNames.length; ++i){
                var methodName = methodNames[i];
                instance[methodName] = {
                    type: TYPES.FUNCTION,
                    evaluate: Mat.matEvaluate.bind(null, matName, methodName)
                }
            }
        },
        colEvaluate: function(matName, result, args, ctx, callObject) {
            var qualifiedName = matName + ".col";
            var typeInfo = {};

            var cols = Mat.TYPES[matName].cols, rows = Mat.TYPES[matName].rows;

            if(args.length > 1){
                Vec.checkVecArguments(qualifiedName, rows, true, 1, result, args);
                Base.extend(typeInfo, Mat.getType(matName));
            }
            else{
                ns.checkParamCount(result.node, qualifiedName, [1], args.length);
                Base.extend(typeInfo, Vec.getType(rows));
            }
            if(!args[0].canNumber()){
                Shade.throwError(result.node, "Invalid parameter for " + qualifiedName + ", first parameter must be a number.");
            }

            // TODO: Vec.getConstantValue(typeInfo, "col", args, callObject);

            return typeInfo;
        }

    }

    ns.Vec = Vec;
    ns.Mat = Mat;
    ns.allArgumentsAreStatic = allArgumentsAreConstant;


}(exports));

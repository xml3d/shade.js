(function (module) {

    // dependencies
    var walker = require('walkes');
    var worklist = require('analyses');
    var common = require("../base/common.js");
    var esgraph = require('esgraph');
    var codegen = require('escodegen');
    var Tools = require("./settools.js");
    var Shade = require("./../interfaces.js");

    // shortcuts
    var Syntax = common.Syntax;
    var Set = worklist.Set,
        Types = Shade.TYPES,
        Kinds = Shade.OBJECT_KINDS;

    // defines

    /**
     * Possible Spaces
     * @enum
     */
    var SpaceType = {
        OBJECT: 0,
        VIEW: 1,
        WORLD: 2,
        RESULT: 5
    };
    var VectorType = {
        NONE: 0,
        POINT: 1,
        NORMAL: 2
    };
    var SpaceVectorType = {
        OBJECT: SpaceType.OBJECT,
        VIEW_POINT : SpaceType.VIEW + (VectorType.POINT << 3),
        WORLD_POINT : SpaceType.WORLD + (VectorType.POINT << 3),
        VIEW_NORMAL : SpaceType.VIEW + (VectorType.NORMAL << 3),
        WORLD_NORMAL : SpaceType.WORLD + (VectorType.NORMAL << 3),
        RESULT_POINT : SpaceType.RESULT + (VectorType.POINT << 3),
        RESULT_NORMAL : SpaceType.RESULT + (VectorType.NORMAL << 3)
    };
    function getVectorFromSpaceVector(spaceType){
        return spaceType >> 3;
    }
    function getSpaceFromSpaceVector(spaceType){
        return spaceType % 8;
    }

    var c_resultPointOk = true, c_resultNormalOk = true,
        c_customFunctionPropagations = null;

    function analyze(functionAast, customFunctionPropagations) {
        var cfg = esgraph(functionAast.body, { omitExceptions: true });
        c_resultPointOk = true; c_resultNormalOk = true;
        c_customFunctionPropagations = customFunctionPropagations || {};
        var output = worklist(cfg, transferSpaceInfo, {
            direction: 'backward',
            start: null,
            merge: worklist.merge(mergeSpaceInfo)
        });
        var startNodeResult = output.get(cfg[0]);
        var result = {};
        var tranferEntry = {
            transferPointOk: c_resultPointOk,
            transferNormalOk: c_resultNormalOk,
            transferArgs: []
        };
        var transferSpaces = {};
        startNodeResult.forEach(function(elem) {
            var split = elem.split(";"), name = split[0], space = split[1]*1;
            if(getSpaceFromSpaceVector(space) == SpaceType.RESULT){
                transferSpaces[name] = true;
                return;
            }
            if(!result[name]) result[name] = [];
            result[name].push(space);
        });
        for(var i = 0; i < functionAast.params.length; ++i){
            var name = functionAast.params[i].name;
            tranferEntry.transferArgs.push( transferSpaces[name]);
        }
        c_customFunctionPropagations[functionAast.id.name] = tranferEntry;
        return result;
    }


    function setSpaceInfo(ast, key, value){
        if(!ast.spaceInfo)
            ast.spaceInfo = {};
        ast.spaceInfo[key] = value;
    }
    function setSpaceInfoSpaces(ast, key, spaces){
        var values = spaces && spaces.filter(function(space){ return getSpaceFromSpaceVector(space) != SpaceType.RESULT });
        setSpaceInfo(ast, key, values);
    }

    /**
     * @param {Set} input
     * @this {FlowNode}
     * @returns {Set} output with respect to input
     */
    function transferSpaceInfo(input) {
        if (this.type || !this.astNode) // Start and end node do not influence the result
            return input;

        // Local
        var kill = this.kill = this.kill || Tools.findVariableAssignments(this.astNode);
        var generatedDependencies = this.generate = this.generate || generateSpaceDependencies(this.astNode, kill);
        //generate && console.log(this.label, generate);

        // Depends on input
        var depSpaceInfo = new Set(), finalSpaces = null, spaceTypes = null;
        setSpaceInfo(this.astNode, "transferSpaces", null);
        setSpaceInfo(this.astNode, "hasSpaceOverrides", generatedDependencies.dependencies.spaceOverrides.length > 0);
        if(generatedDependencies.def){
            var def = generatedDependencies.def;
            setSpaceInfo(this.astNode, "def", def);
            spaceTypes = getSpaceVectorTypesFromInfo(input, def);
        }
        else{
            spaceTypes = new Set([SpaceVectorType.OBJECT])
            if(this.astNode.type == Syntax.ReturnStatement){
                spaceTypes.add(SpaceVectorType.RESULT_NORMAL);
                spaceTypes.add(SpaceVectorType.RESULT_POINT);
            }
        }
        setSpaceInfoSpaces(this.astNode, "transferSpaces", spaceTypes);
        finalSpaces = createSpaceInfoFromDependencies(depSpaceInfo, generatedDependencies.dependencies, spaceTypes);
        setSpaceInfoSpaces(this.astNode, "finalSpaces", (finalSpaces && finalSpaces.size > 0) ? finalSpaces : null);

        input = new Set(input.filter(function (elem) {
            return !kill.has(elem.split(";")[0]);
        }));
        return mergeSpaceInfo(input, depSpaceInfo);
    }

    function getSpaceVectorTypesFromInfo(spaceInfo, identifier){
        var set = new Set(spaceInfo.filter(function(elem){return elem.split(";")[0] == identifier}).map(function(elem){ return elem.split(";")[1]*1}));
        if(set.size == 0)
            set.add(SpaceVectorType.OBJECT);
        return set;
    }
    function isSpaceTypeValid(spaceType, dependencies){
        var type = getVectorFromSpaceVector(spaceType);
        return type == VectorType.NONE || (type == VectorType.NORMAL && !dependencies.normalSpaceViolation)
           || (type == VectorType.POINT && !dependencies.pointSpaceViolation);
    }

    function createSpaceInfoFromDependencies(depSpaceInfo, dependencies, spaces){
        var finalSpaces = new Set();
        dependencies.toObjectSet.forEach(function(name){
            depSpaceInfo.add(  name + ";" + SpaceVectorType.OBJECT);
        })
        spaces.forEach(function(spaceVector){
            var space = getSpaceFromSpaceVector(spaceVector);
            var isValid = isSpaceTypeValid(spaceVector, dependencies);

            if(space != SpaceType.OBJECT && dependencies.hasDirectVec3SpaceOverride()){
                if(space == SpaceType.RESULT)
                    isValid = false;
                else
                    throw new Error("Detection of repeated space conversion. Not supported!");
            }

            if(isValid){
                finalSpaces.add(spaceVector);
            }
            if(!isValid && space == SpaceType.RESULT){
                if(getVectorFromSpaceVector(spaceVector) == VectorType.NORMAL)
                    c_resultNormalOk = false;
                else
                    c_resultPointOk = false;
            }
            spaceVector = isValid ?  spaceVector : SpaceVectorType.OBJECT;

            dependencies.propagateSet.forEach(function(name){
                depSpaceInfo.add( name + ";"  + spaceVector );
            });
        });
        var overrides = dependencies.spaceOverrides;
        for(var i = 0; i < overrides.length; ++i){
            createSpaceInfoFromDependencies(depSpaceInfo, overrides[i].dependencies, new Set( [overrides[i].space] ));
        }
        return finalSpaces;
    }


    /**
     * Special merge function that merges entries with same names
     * to a new entry with top element Semantic.UNKNOWN
     * @param {Set} a
     * @param {Set} b
     * @returns {Set}
     */
    function mergeSpaceInfo(a, b) {
        var s = a ? new Set(a) : new Set();
        if (b)
            b.forEach(
                function (elem) {
                    s.add(elem);
                }
            );
        return s;
    }

    function SpaceDependencies(){
        this.normalSpaceViolation = null;
        this.pointSpaceViolation = null;
        this.propagateSet = new Set();
        this.toObjectSet = new Set();
        this.spaceOverrides = [];
    }

    SpaceDependencies.prototype.addSpaceOverride = function(space, fromObjectSpace, dependencies){
        this.spaceOverrides.push({ space: space, fromObjectSpace: fromObjectSpace, dependencies: dependencies})
    }
    SpaceDependencies.prototype.hasDirectVec3SpaceOverride = function(){
        var i = this.spaceOverrides.length;
        while(i--){
            if(!this.spaceOverrides[i].fromObjectSpace)
                return true;
        }
        return false;
    }


    function generateSpaceDependencies(ast, defs) {
        var result = {def: null, dependencies: new SpaceDependencies()};
        if (!ast && !ast.type)
            return result;
        var defCount = defs.size;
        if (defCount > 1)
            throw new Error("Code not sanitized, found multiple definitions in one statement");
        if(defCount == 1)
            result.def = defs.values()[0];
        // TODO: Properly determine FLOAT3 statements
        var isFloat3Statement = (ast.extra && ast.extra.kind == Kinds.FLOAT3);

        if(isFloat3Statement){
            gatherSpaceDependencies(ast, result.dependencies);
            setSpaceInfo(ast, "propagateSet", result.dependencies.propagateSet.values());
        }
        else
            gatherObjectDependencies(ast, result.dependencies);

        return result;
    }

    function getSpaceConversion(callAst){
        var callee = callAst.callee;
        if(callee.type == Syntax.MemberExpression && callee.object.type == Syntax.ThisExpression){
            var spaceType = 0;
            switch(callee.property.name){
                case "transformPoint": spaceType = VectorType.POINT; break;
                case "transformNormal": spaceType = VectorType.NORMAL; break;
            }
            spaceType = spaceType << 3;
            if(spaceType){
                var firstArg = callAst.arguments[0];

                if(firstArg.type != Syntax.MemberExpression || firstArg.object.type != Syntax.Identifier
                    || firstArg.object.name != "Space" || firstArg.property.type != Syntax.Identifier)
                    throw new Error("The first argument of '" + callee.property + "' must be a Space enum value.");
                switch(firstArg.property.name){
                    case "VIEW" : spaceType += SpaceType.VIEW; break;
                    case "WORLD": spaceType += SpaceType.WORLD; break;
                }
                return spaceType;
            }
        }
        return null;
    }

    function handleSpaceOverride(callAst, result, fromObjectSpace){
        var space = getSpaceConversion(callAst);
        if(space){
            var subResult = new SpaceDependencies();
            gatherSpaceDependencies(callAst.arguments[1], subResult);
            result.addSpaceOverride(space, fromObjectSpace, subResult);
            setSpaceInfo(callAst, "spaceOverride", space);
            setSpaceInfo(callAst, "propagateSet", subResult.propagateSet.values());
            return true;
        }
        return false;
    }

    function gatherObjectDependencies(ast, result){
        walker(ast, {
            VariableDeclaration: function(){},
            Identifier: function(){
                if(this.extra.kind == Kinds.FLOAT3){
                    result.toObjectSet.add(this.name);
                }

            },
            MemberExpression: function (recurse) {
                if(this.extra.kind == Kinds.FLOAT3){
                    if (this.object.type == Syntax.Identifier && this.property.type == Syntax.Identifier) {
                        if(this.object.extra.global)
                            result.propagateSet.add("env." + this.property.name);
                        else{
                            throw new Error("Member Access of non 'env' object in space equation - not supported.");
                        }
                    }
                }
                else{
                    recurse(this.object);
                    recurse(this.property);
                }
            },
            CallExpression: function (recurse) {
                if(handleSpaceOverride(this, result, true))
                    return;
                recurse(this.callee);
                this.arguments.map(recurse);
            }
        });
    }

    function gatherSpaceDependencies(ast, result) {
        walker(ast, {
            VariableDeclaration: function(){},
            AssignmentExpression: function (recurse) {
                recurse(this.right);
            },
            Identifier: function () {
                if(this.extra.kind == Kinds.FLOAT3){
                    result.propagateSet.add(this.name);
                    setSpaceInfo(this, "propagate", true);
                }
             },
            NewExpression: function (recurse) {
                if(this.callee == "Vec3"){
                    handleVec3Args(this.arguments, recurse, result, false);
                }
            },
            MemberExpression: function (recurse) {
                if(this.extra.kind == Kinds.FLOAT3){
                    if (this.object.type == Syntax.Identifier && this.property.type == Syntax.Identifier) {
                        if(this.object.extra.global)
                            result.propagateSet.add("env." + this.property.name);
                        else{
                            throw new Error("Member Access of non 'env' object in space equation - not supported.")
                        }
                        setSpaceInfo(this, "propagate", true);
                    }
                }
                else{
                    recurse(this.object);
                    recurse(this.property);
                }
            },
            CallExpression: function (recurse) {
                if(handleSpaceOverride(this, result, false))
                    return;
                if (this.callee.type == Syntax.MemberExpression) {
                    result.pointSpaceViolation = true;
                    var callObject = this.callee.object;
                    var objectKind = callObject.extra.kind,
                        method = this.callee.property.name,
                        args = this.arguments;
                    if(PropagationRules[objectKind] && PropagationRules[objectKind][method]){
                        PropagationRules[objectKind][method](callObject, args, recurse, result);
                        return;
                    }
                    console.log("Unhandled: ", codegen.generate(this))
                }else if(this.callee.type == Syntax.Identifier){
                    var id = this.callee.name;
                    var customEntry = c_customFunctionPropagations && c_customFunctionPropagations[id];
                    if(customEntry){
                        if(!customEntry.transferPointOk) result.pointSpaceViolation = true;
                        if(!customEntry.transferNormalOk) result.normalSpaceViolation = true;
                        var i = customEntry.transferArgs.length;
                        while(i--){
                            if(customEntry.transferArgs[i])
                                recurse(this.arguments[i]);
                            else
                                gatherObjectDependencies(this.arguments[i], result);
                        }
                        return;
                    }
                }
                result.pointSpaceViolation = true;
                result.normalSpaceViolation = true;
                this.arguments.forEach(function(arg){ gatherObjectDependencies(arg, result)});
            }
        });
    }

    function handleScaleOperator(callObject, args, recurse, result){
        handleVec3Args(args, recurse, result, true);
        recurse(callObject);
    }
    function handleAddSubOperation(callObject, args, recurse, result){
        handleVec3Args(args, recurse, result, false);
        recurse(callObject);
    }

    function handleVec3Args(args, recurse, result, scaling){
        if(!scaling && args.length == 0){
            result.normalSpaceViolation = true;
            return;
        }
        if(args.length > 1){
            result.normalSpaceViolation = true;
            return;
        }
        if(args.length == 1){
            if(args[0].extra.kind == Kinds.FLOAT3){
                recurse(args[0]);
            }
            else if(scaling && args[0].extra.type == Types.NUMBER){
                gatherObjectDependencies(args[0], result);
            }
            else{
                result.normalSpaceViolation = true;
            }
        }
    }


    var PropagationRules = {
        "float3" : {
            "add" : handleAddSubOperation,
            "sub" : handleAddSubOperation,
            "mul" : handleScaleOperator,
            "div" : handleScaleOperator,
            "normalize" : handleScaleOperator
        }
    }
    module.exports = {
        SpaceVectorType: SpaceVectorType,
        SpaceType: SpaceType,
        VectorType: VectorType,
        getVectorFromSpaceVector: getVectorFromSpaceVector,
        getSpaceFromSpaceVector: getSpaceFromSpaceVector,
        analyze: analyze
    };

}(module));

(function (module) {

    // dependencies
    var walker = require('walkes');
    var worklist = require('analyses');
    var common = require("../base/common.js");
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
    var SpaceFlags = {
        OBJECT: 0,
        VIEW: 1,
        WORLD: 2
    };
    var TypeFlags = {
        NONE: 0,
        POINT: 1,
        NORMAL: 2
    };
    var SpaceTypes = {
        OBJECT: SpaceFlags.OBJECT,
        VIEW_POINT : SpaceFlags.VIEW + (TypeFlags.POINT << 3),
        WORLD_POINT : SpaceFlags.WORLD + (TypeFlags.POINT << 3),
        VIEW_NORMAL : SpaceFlags.VIEW + (TypeFlags.NORMAL << 3),
        WORLD_NORMAL : SpaceFlags.WORLD + (TypeFlags.NORMAL << 3)
    };
    function getTypeFromSpaceType(spaceType){
        return spaceType >> 3;
    }
    function getSpaceFromSpaceType(spaceType){
        return spaceType % 8;
    }

    /**
     * @param cfg
     * @param {FlowNode} start
     * @returns {Map}
     */
    function space(cfg, start) {
        return worklist(cfg, transferSpaceInfo, {
            direction: 'backward',
            start: start,
            merge: worklist.merge(mergeSpaceInfo)
        });
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
        var kill = this.kill = this.kill || Tools.findVariableDefinitions(this.astNode);
        var generatedDependencies = this.generate = this.generate || generateSpaceDependencies(this.astNode, kill);
        //generate && console.log(this.label, generate);

        // Depends on input
        this.transferSpaces = null;
        var depSpaceInfo = new Set();
        if(generatedDependencies.def){
            var def = generatedDependencies.def;
            var spaceTypes = getSpaceTypesFromInfo(input, def);
            if(spaceTypes.length > 1){
                this.transferSpaces = spaceTypes;
                createSpaceInfoFromDependencies(depSpaceInfo, generatedDependencies.dependencies, spaceTypes);
            }
        }
        else{
            createSpaceInfoFromDependencies(depSpaceInfo, generatedDependencies.dependencies, new Set([SpaceTypes.OBJECT]));
        }

        input = new Set(input.filter(function (elem) {
            return !kill.has(elem.name);
        }));
        return mergeSpaceInfo(input, depSpaceInfo);
    }

    function getSpaceTypesFromInfo(spaceInfo, identifier){
        return new Set(spaceInfo.filter(function(elem){return elem.name == identifier}).map(function(elem){ return elem.space}));
    }
    function isSpaceTypeValid(spaceType, dependencies){
        var type = getTypeFromSpaceType(spaceType);
        return type == TypeFlags.NONE || (type == TypeFlags.NORMAL && !dependencies.normalSpaceViolation)
           || (type == TypeFlags.POINT && !dependencies.pointSpaceViolation);
    }

    function createSpaceInfoFromDependencies(depSpaceInfo, dependencies, spaces){
        dependencies.toObjectSet.forEach(function(name){
            depSpaceInfo.add({name: name, space: SpaceTypes.OBJECT});
        })
        spaces.forEach(function(spaceType){
            if(getSpaceFromSpaceType(spaceType) != SpaceFlags.OBJECT && dependencies.hasDirectVec3SpaceOverride())
                throw new Error("Detection of repeated space conversion. Not supported!");

            spaceType = isSpaceTypeValid(spaceType, dependencies) ?  spaceType : SpaceTypes.OBJECT;
            dependencies.propagateSet.forEach(function(name){
                depSpaceInfo.add({name: name, space: spaceType});
            });
        });
        var overrides = dependencies.spaceOverrides;
        for(var i = 0; i < overrides.length; ++i){
            createSpaceInfoFromDependencies(depSpaceInfo, overrides[i].dependencies, new Set( [overrides[i].space] ));
        }
    }


    /**
     * Special merge function that merges entries with same names
     * to a new entry with top element Semantic.UNKNOWN
     * @param {Set} a
     * @param {Set} b
     * @returns {Set}
     */
    function mergeSpaceInfo(a, b) {
        if (!a && b)
            return new Set(b);
        var s = new Set(a);
        if (b)
            b.forEach(
                function (elem) {
                    var name = elem.name, space = elem.space;
                    var resultA = a.filter(function (other) {
                        return other.name == name && other.space == space;
                    });
                    if (!resultA.length) {
                        s.add(elem);
                    }
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

    SpaceDependencies.prototype.addSpaceOverride = function(space, fromObjectSpace, dependencies, ast){
        this.spaceOverrides.push({ space: space, fromObjectSpace: fromObjectSpace,
            dependencies: dependencies, ast: ast})
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
        var isFloat3Statement = (ast.extra.kind == Kinds.FLOAT3);

        if(isFloat3Statement)
            gatherSpaceDependencies(ast, result.dependencies);
        else
            gatherObjectDependencies(ast, result.dependencies);

        return result;
    }

    function getSpaceConversion(callAst){
        var callee = callAst.callee;
        if(callee.type == Syntax.MemberExpression && callee.object.type == Syntax.ThisExpression){
            var spaceType = 0;
            switch(callee.property){
                case "transformPoint": spaceType = TypeFlags.POINT; break;
                case "transformNormal": spaceType = TypeFlags.NORMAL; break;
            }
            spaceType = spaceType << 3;
            if(spaceType){
                var firstArg = callAst.arguments[0];

                if(firstArg.type != Syntax.MemberExpression || firstArg.object.type != Syntax.Identifier
                    || firstArg.object.name != "Space" || firstArg.property.type != Syntax.Identifier)
                    throw new Error("The first argument of '" + callee.property + "' must be a Space enum value.");
                switch(firstArg.property.name){
                    case "View" : spaceType += SpaceFlags.VIEW; break;
                    case "World": spaceType += SpaceFlags.WORLD; break;
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
            gatherSpaceDependencies(callAst, subResult);
            result.addSpaceOverride(space, fromObjectSpace, subResult, callAst);
            return true;
        }
        return false;
    }

    function gatherObjectDependencies(ast, result){
        walker(ast, {
            Identifier: function(){
                if(this.extra.kind == Kinds.FLOAT3)
                    result.toObjectSet.add(this.name);
            },
            MemberExpression: function (recurse) {
                if(this.extra.kind == Kinds.FLOAT3){
                    if (this.object.type == Syntax.Identifier && this.property.type == Syntax.Identifier) {
                        result.toObjectSet.add(this.object.name + "." + this.property.name);
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
                recurse(this.arguments);
            }
        });
    }

    function gatherSpaceDependencies(ast, result) {
        walker(ast, {
            AssignmentExpression: function (recurse) {
                recurse(this.right);
            },
            Identifier: function () {
                if(this.extra.kind == Kinds.FLOAT3){
                    result.propagateSet.add(this.name);
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
                        result.propagateSet.add(this.object.name + "." + this.property.name);
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
                result.pointSpaceViolation = true;
                if (this.callee.type == Syntax.MemberExpression) {
                    var callObject = this.callee.object;
                    var objectKind = callObject.extra.kind,
                        method = this.callee.property.name,
                        args = this.arguments;
                    if(PropagationRules[objectKind] && PropagationRules[objectKind][method]){
                        PropagationRules[objectKind][method](callObject, args, recurse, result);
                        return;
                    }
                    console.log("Unhandled: ", codegen.generate(this))
                }
                else{
                    gatherObjectDependencies(this.arguments, result);
                }
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

    space.SpaceTypes = SpaceTypes;
    module.exports = space;

}(module));

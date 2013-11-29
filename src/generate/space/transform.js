(function (ns) {

    var Base = require("../../base/index.js"),
        common = require("../../base/common.js"),
        FunctionAnnotation = require("../../base/annotation.js").FunctionAnnotation,
        TypeInfo = require("../../base/typeinfo.js").TypeInfo,
        Shade = require("./../../interfaces.js"),
        esgraph = require('esgraph'),
        Types = Shade.TYPES,
        Kinds = Shade.OBJECT_KINDS,
        Sources = require("./../../interfaces.js").SOURCES;
    var spaceAnalyzer = require("../../analyze/space_analyzer.js"),
        SpaceVectorType = spaceAnalyzer.SpaceVectorType,
        SpaceType = spaceAnalyzer.SpaceType,
        VectorType = spaceAnalyzer.VectorType;



    var walk = require('estraverse');
    var Syntax = walk.Syntax;
    var ANNO = common.ANNO;


    /**
     * Transforms the JS AST to an AST representation convenient
     * for code generation
     * @constructor
     */
    var SpaceTransformer = function (mainId) {
        this.mainId = mainId;
    };

    function spaceInfo(ast){
        return ast.spaceInfo || {};
    }

    Base.extend(SpaceTransformer.prototype, {
        transformAast: function (aast, opt) {
            opt = opt || {};
            this.root = aast;
            this.functionSpaceInfo = {};
            this.functionTranfserInfo = {};
            this.globalIdentifiers = this.getGlobalIdentifiers(aast);
            this.envSpaces = {};

            this.transformFunctions(aast);
            this.updateGlobalObject(aast, this.envSpaces);
            return this.envSpaces;
        },
        /**
         *
         * @param {Object!} ast
         * @param {Object!} state
         * @returns {*}
         */
        transformFunctions: function(aast) {
            var self = this;
            aast = walk.replace(aast, {
                enter: function (node, parent) {
                    //console.log("Enter:", node.type);
                    switch (node.type) {
                        case Syntax.FunctionDeclaration:
                            self.replaceFunctionInvocations(node.body);
                            self.extractSpaceTransforms(node);
                            this.skip();
                            break;
                    }
                }
            });
            return aast;
        },
        replaceFunctionInvocations: function(functionBodyAast){
            var self = this;
            walk.replace(functionBodyAast, {
                enter: function (node, parent) {
                    if(node.type == Syntax.CallExpression){
                        if(node.callee.type == Syntax.Identifier && self.functionSpaceInfo[node.callee.name]){
                            var paramTransitions = self.functionSpaceInfo[node.callee.name];
                            var oldArgs = node.arguments, newArgs = [];
                            for(var i = 0; i < paramTransitions.length; ++i){
                                var paramT = paramTransitions[i];
                                if(!paramT.space)
                                    newArgs.push(oldArgs[paramT.idx]);
                                else{
                                    var callExpression = {
                                        type: Syntax.CallExpression,
                                        callee: self.getSpaceConvertFunction(paramT.space),
                                        arguments: [ self.getSpaceConvertArg(paramT.space), oldArgs[paramT.idx]]
                                    };
                                    newArgs.push(callExpression);
                                }
                            }
                            node.arguments = newArgs;
                        }
                    }
                }
            });
        },

        getSpaceConvertFunction: function(space){
            var vectorType = spaceAnalyzer.getVectorFromSpaceVector(space);
            var functionName;
            switch(vectorType){
                case VectorType.POINT: functionName = "transformPoint"; break;
                case VectorType.NORMAL: functionName = "transformNormal"; break;
            }
            return {
                type: Syntax.MemberExpression,
                object: { type: Syntax.ThisExpression },
                property: { type: Syntax.Identifier, name: functionName }
            };
        },
        getSpaceConvertArg: function(space){
            var spaceType = spaceAnalyzer.getSpaceFromSpaceVector(space);
            var spaceName;
            switch(spaceType){
                case SpaceType.VIEW: spaceName = "VIEW"; break;
                case SpaceType.WORLD: spaceName = "WORLD"; break;
            }
            return {
                type: Syntax.MemberExpression,
                object: { type: Syntax.Identifier, name: "Space"  },
                property: { type: Syntax.Identifier, name: spaceName }
            };
        },


        extractSpaceTransforms: function(functionAast){
            var self = this;
            this.usedIdentifiers = this.getUsedIdentifiers(functionAast);

            var analyzeResult = spaceAnalyzer.analyze(functionAast, this.functionTranfserInfo);
            var nameMap = {}, addDeclarations = [];
            this.extractEnvSpaces(analyzeResult, nameMap);
            this.initFunctionHeader(functionAast, analyzeResult, nameMap, addDeclarations);

            functionAast.body = walk.replace(functionAast.body, {
                enter: function (node, parent) {
                    //console.log("Enter:", node.type);
                    if(node.type == Syntax.ExpressionStatement){
                        var newStatement = self.duplicateSpaceStatement(node, nameMap, addDeclarations);
                        if(newStatement){
                            this.skip();
                            return newStatement;
                        }
                    }
                    else if(spaceInfo(node).hasSpaceOverrides){
                        self.resolveSpaceUsage(node, SpaceVectorType.OBJECT, nameMap);
                        this.skip();
                    }
                }
            });
            this.addDeclarations(functionAast, addDeclarations);
            this.cleanUpDeclarations(functionAast);
        },

        extractEnvSpaces: function(analyzeResult, nameMap){
            for(var name in analyzeResult){
                if(name.indexOf("env.") == 0){
                    var property = name.substr(4);
                    var j = analyzeResult[name].length;
                    while(j--){
                        var space = analyzeResult[name][j];
                        var spaceName = this.getSpaceName(name, space);
                        if(!this.envSpaces[property]) this.envSpaces[property] = [];
                        if( !this.envSpaces[property].some(function(e){return e.space == space}))
                            this.envSpaces[property].push({ name: spaceName.split(".")[1], space: space } );
                        if(!nameMap[name]) nameMap[name] = {};
                        nameMap[name][space] = this.getSpaceName(name, space);
                    }
                }
            }
        },

        initFunctionHeader: function(functionAast, analyzeResult, nameMap, addDeclarations){
            var newParams = [];
            var paramTransitions = [];
            for(var i = 0; i < functionAast.params.length; ++i){
                var param = functionAast.params[i], paramName = param.name;
                if(analyzeResult[paramName]){
                    var j = analyzeResult[paramName].length, hasObjectSpace = false;
                    while(j--){
                        var space = analyzeResult[paramName][j];
                        if(space != SpaceVectorType.OBJECT){
                            if(!nameMap[paramName]) nameMap[paramName] = {};
                            nameMap[paramName][space] = this.getSpaceName(paramName, space);
                            var newParam = {
                                type: Syntax.Identifier,
                                name: nameMap[paramName][space]
                            };
                            ANNO(newParam).copy(ANNO(param));
                            newParams.push(newParam);
                            paramTransitions.push({idx: i, space: space});
                        }
                        else{
                            hasObjectSpace = true;
                            newParams.push(param);
                            paramTransitions.push({idx: i});
                        }
                    }
                    if(!hasObjectSpace){
                        addDeclarations.push(paramName);
                    }
                }
                else{
                    newParams.push(param);
                    paramTransitions.push({idx: i});
                }
            }
            functionAast.params = newParams;
            this.functionSpaceInfo[functionAast.id.name] = paramTransitions;
        },

        duplicateSpaceStatement: function(statementAast, nameMap, addedDeclarations){
            var duplicatedStatements = [];
            var child = statementAast.expression;
            var sInfo = spaceInfo(child);

            var newSpaceNameEntries = {};
            if(!sInfo.finalSpaces){
                nameMap[sInfo.def] = newSpaceNameEntries;
                return;
            }

            sInfo.finalSpaces.forEach(function(space){
                if(space != SpaceVectorType.OBJECT && !this.isSpacePropagrationPossible(sInfo, space, nameMap))
                    return;

                var expressionCopy = Base.deepExtend({}, child);
                this.resolveSpaceUsage(expressionCopy, space, nameMap);
                duplicatedStatements.push({ type: Syntax.ExpressionStatement, expression: expressionCopy });
                if(space != SpaceVectorType.OBJECT){
                    var spaceName = this.getSpaceName(sInfo.def, space);
                    if(addedDeclarations.indexOf(spaceName) == -1)
                        addedDeclarations.push(spaceName);
                    newSpaceNameEntries[space] = spaceName;
                    expressionCopy.left.name = spaceName;
                }

            }.bind(this));
            nameMap[sInfo.def] = newSpaceNameEntries;

            if(duplicatedStatements.length == 0)
                return;
            if(duplicatedStatements.length == 1)
                return duplicatedStatements[0];

            var blockStatement = {
                type: Syntax.BlockStatement,
                body: duplicatedStatements
            }
            return blockStatement

        },

        addDeclarations: function(functionAast, addDeclarations){
            var i = functionAast.params.length;
            while(i--) {
                var idx = addDeclarations.indexOf(functionAast.params[i].name);
                if(idx != -1)
                    addDeclarations.splice(idx, 1);
            }
            if(addDeclarations.length > 0){
                var declarations = { type: Syntax.VariableDeclaration, kind: "var", declarations: []};
                var i = addDeclarations.length;
                while(i--){
                    name = addDeclarations[i];
                    var decl = {type: Syntax.VariableDeclarator, id: {type: Syntax.Identifier, name: name}, init: null};
                    ANNO(decl).setType(Types.OBJECT, Kinds.FLOAT3);
                    declarations.declarations.push(decl);
                }
                functionAast.body.body.unshift(declarations);
            }
        },

        isSpacePropagrationPossible: function(sInfo, targetSpace, nameMap){
            var spaceForNameNotFound = sInfo.propagateSet.some(function(identifier){
                return !(nameMap[identifier] && nameMap[identifier][targetSpace]);
            });
            return !spaceForNameNotFound;
        },

        resolveSpaceUsage: function(aast, targetSpace, nameMap){
            var self = this;
            aast = walk.replace(aast, {
                enter: function (node, parent) {
                    //console.log("Enter:", node.type);
                    switch (node.type) {
                        case Syntax.Identifier:
                            if(targetSpace != SpaceVectorType.OBJECT && spaceInfo(node).propagate){
                                node.name = nameMap[node.name][targetSpace];
                            }
                            break;
                        case Syntax.MemberExpression:
                            if(targetSpace != SpaceVectorType.OBJECT && spaceInfo(node).propagate){
                                var nameKey = "env." + node.property.name;
                                var name = nameMap[nameKey][targetSpace],
                                    token = name.split(".");
                                node.property.name = token[1];
                            }
                            break;
                        case Syntax.CallExpression:
                            var sInfo = spaceInfo(node);
                            if(sInfo.spaceOverride &&
                                self.isSpacePropagrationPossible(sInfo, sInfo.spaceOverride, nameMap))
                            {
                                var result = self.resolveSpaceUsage(node.arguments[1], sInfo.spaceOverride, nameMap);
                                this.skip();
                                return result;
                            }
                    }
                }
            });
            return aast;
        },

        getSpaceName: function(name, space){
            if(space == SpaceVectorType.OBJECT)
                return name;

            var checkGlobal = false;
            if(name.indexOf("env.") == 0){
                checkGlobal = true;
                name = name.substr(4);
            }
            switch(space){
                case SpaceVectorType.VIEW_POINT : name += "_vps"; break;
                case SpaceVectorType.WORLD_POINT : name += "_wps"; break;
                case SpaceVectorType.VIEW_NORMAL : name += "_vns"; break;
                case SpaceVectorType.WORLD_NORMAL : name += "_wns"; break;
            }
            var result = name;
            var i = 2;
            while( (checkGlobal ? this.globalIdentifiers : this.usedIdentifiers ).indexOf(result) != -1){
                result = name + i++;
            }
            if(checkGlobal)
                result = "env." + result;
            return result;
        },

        getUsedIdentifiers : function(functionAast){
            var result = [];
            walk.traverse(functionAast, {
                enter: function (node, parent) {
                    //console.log("Enter:", node.type);
                    if(node.type == Syntax.Identifier){
                        if( parent.type == Syntax.MemberExpression && parent.property == node)
                            return;
                        if(result.indexOf(node.name) == -1)
                            result.push(node.name);
                    }
                }
            });
            return result;
        },
        getGlobalIdentifiers : function(programAast){
            var result = [];
            walk.traverse(programAast, {
                enter: function (node, parent) {
                    //console.log("Enter:", node.type);
                    if(node.type == Syntax.MemberExpression && node.object.extra.global){
                        if(result.indexOf(node.property.name) == -1)
                            result.push(node.property.name);
                    }
                }
            });
            return result;
        },
        cleanUpDeclarations: function(functionAast){
            var declarators = [];
            var body = functionAast.body.body;
            var i = body.length;
            while(i--){
                if(body[i].type == Syntax.VariableDeclaration){
                    declarators.push.apply(declarators, body[i].declarations);
                    body.splice(i,1);
                }
            }
            var usedIdentifiers = this.getUsedIdentifiers(functionAast.body);
            var declaration = { type: Syntax.VariableDeclaration, kind: "var", declarations: []};
            i = declarators.length;
            while(i--){
                if(usedIdentifiers.indexOf(declarators[i].id.name) != -1){
                    declaration.declarations.push(declarators[i]);
                }
            }
            if(declaration.declarations.length > 0)
                body.unshift(declaration);
        },

        updateGlobalObject: function(aast, envSpaces){
            if(!aast.globalParameters)
                return;
            var globalObject;
            for(var funcName in aast.globalParameters){
                var args = aast.globalParameters[funcName];
                var i = args.length;
                while(i--){
                    if(args[i].extra.global)
                        globalObject = args[i].extra;
                }
            }
            if(!globalObject)
                return;
            var newInfo = {};
            for(var propName in globalObject.info){
                var data = globalObject.info[propName];
                if(!envSpaces[propName]){
                    newInfo[propName] = data;
                    continue;
                }
                var entryList = envSpaces[propName];
                for(var i = 0; i < entryList.length; ++i){
                    var copyData = Base.deepExtend({}, data);
                    newInfo[entryList[i].name]= copyData;
                }
            }
            globalObject.info = newInfo;
            walk.traverse(aast, {
                enter: function (node, parent) {
                    //console.log("Enter:", node.type);
                    if(node.extra && node.extra.global){
                        node.extra.info = newInfo;
                    }
                    if(node.scope && node.scope.bindings){
                        for(var name in node.scope.bindings){
                            if(node.scope.bindings[name].extra.global){
                                node.scope.bindings[name].extra.info = newInfo;
                            }
                        }
                    }
                }
            });
        }


    });

    // Exports
    ns.SpaceTransformer = new SpaceTransformer();


}(exports));

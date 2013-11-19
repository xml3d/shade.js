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
        transformProgram: function (program, opt) {
            opt = opt || {};
            this.root = program;
            this.functionSpaceInfo = {};
            this.envSpaces = {};

            this.transformFunctions(program);
            return program;
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
            functionBodyAast.body = walk.replace(functionBodyAast.body, {
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
                        var newStatement = self.duplicateSpaceStatement(node);
                        if(newStatement){
                            this.skip();
                            return newStatement;
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
            var analyzeResult = spaceAnalyzer.analyze(functionAast.body);
            var nameMap = {};
            this.extractEnvSpaces(analyzeResult);
            this.initFunctionHeader(functionAast, analyzeResult, nameMap);

            functionAast.body = walk.replace(functionAast.body, {
                enter: function (node, parent) {
                    //console.log("Enter:", node.type);
                    if(node.type == Syntax.ExpressionStatement){
                        var newStatement = self.duplicateSpaceStatement(node);
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
        },

        extractEnvSpaces: function(analyzeResult){
            for(var name in analyzeResult){
                if(name.indexOf("env.") == 0){
                    var property = name.substr(4);
                    var j = analyzeResult[name].length;
                    while(j--){
                        var space = analyzeResult[name][j];
                        if(!this.envSpaces[property]) this.envSpaces[property] = [];
                        if(this.envSpaces[property].indexOf(space) == -1) this.envSpaces[property].push(space);
                    }
                }
            }
        },

        initFunctionHeader: function(functionAast, analyzeResult, nameMap){
            var newParams = [], startDeclarations = [];
            var paramTransitions = [];
            for(var i = 0; i < functionAast.params.length; ++i){
                var param = functionAast.params[i], paramName = param.name;
                if(analyzeResult[paramName]){
                    var j = analyzeResult[paramName].length, hasObjectSpace = false;
                    while(j--){
                        var space = analyzeResult[paramName][j];
                        if(space != SpaceVectorType.OBJECT){
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
                        startDeclarations.push(param);
                    }
                }
                else{
                    newParams.push(param);
                    paramTransitions.push({idx: i});
                }
            }
            functionAast.params = newParams;
            this.functionSpaceInfo[functionAast.id.name] = paramTransitions;
            if(startDeclarations.length > 0){
                var declaration = {
                    type: Syntax.VariableDeclaration,
                    kind: "var",
                    declarations: []
                };
                var i = startDeclarations.length;
                while(i--){
                    var declarator = {
                        type: Syntax.VariableDeclarator,
                        id: startDeclarations[i],
                        init: null
                    };
                    ANNO(declarator).copy(ANNO(startDeclarations));
                    declaration.declarations.push(declarator);
                }
                functionAast.body.body.unshift(declaration);
            }
        },

        duplicateSpaceStatement: function(statementAast, nameMap, analyzeResult){
            var duplicatedStatements = [];
            var child = statementAast.expression;
            var sInfo = spaceInfo(child);

            var newSpaceNameEntries = {};
            if(!sInfo.finalSpaces){
                nameMap[sInfo.def] = newSpaceNameEntries;
                return;
            }

            sInfo.finalSpaces.forEach(function(space){
                if(space != SpaceVectorType.OBJECT && this.isSpacePropagrationPossible(sInfo, space, nameMap))
                    return;

                var expressionCopy = Base.deepExtend({}, child);
                this.resolveSpaceUsage(expressionCopy, space, nameMap);
                duplicatedStatements.push(expressionCopy);

                if(space != SpaceVectorType.OBJECT){
                    newSpaceNameEntries[space] = this.getSpaceName(sInfo.def, space);
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

        isSpacePropagrationPossible: function(sInfo, targetSpace, nameMap){
            return !sInfo.propagateSet.some(function(identifier){
                return !nameMap[identifier][targetSpace];
            });
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
                                var name = nameMap[node.name][targetSpace],
                                    token = name.split(".");
                                node.property.name = token[1];
                            }
                            break;
                        case Syntax.CallExpression:
                            var sInfo = spaceInfo(node);
                            if(sInfo.spaceOverride &&
                                self.isSpacePropagrationPossible(sInfo, sInfo.spaceOverride, nameMap))
                            {
                                this.skip();
                                return self.resolveSpaceUsage(node, sInfo.spaceOverride, nameMap);
                            }
                    }
                }
            });
            return aast;
        },

        getSpaceName: function(name, space){
            // TODO: Avoid name collisions
            switch(space){
                case SpaceVectorType.VIEW_POINT : return name + "_vps";
                case SpaceVectorType.WORLD_POINT : return name + "_wps";
                case SpaceVectorType.VIEW_NORMAL : return name + "_vns";
                case SpaceVectorType.WORLD_NORMAL : return name + "_wns";
            }
        }

    });

    // Exports
    ns.SpaceTransformer = SpaceTransformer;


}(exports));

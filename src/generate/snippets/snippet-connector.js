(function (ns) {

    var walk = require('estraverse'),
        assert = require("assert"),
        Base = require("../../base/index.js"),
        common = require("./../../base/common.js"),
        Shade = require("../../interfaces.js"),
        TypeInfo = require("../../base/typeinfo.js").TypeInfo,
        StatementSplitTraverser = require("../../analyze/sanitizer/statement-split-traverser"),
        Types = Shade.TYPES,
        Kinds = Shade.OBJECT_KINDS,
        ANNO = require("../../base/annotation.js").ANNO;

    var Syntax = walk.Syntax;
    var VisitorOption = walk.VisitorOption;

    var SNIPPET_CONVERTER_MODE = {
        JS_ITERATE: 1,
        JS_NO_ITERATE: 2,
        GLSL_VS: 3
    };

    var SnippetConnector = function(){

    }

    Base.extend(SnippetConnector.prototype, {
        execute: function(snippetList, mode){
            var context = {
                iterateIdentifier: null,
                envName: null,
                blockedNames: [],
                transferInputNameMap: {},
                outputNameMap: [],
                directInputNameMap: [],
                mode: mode,
                declareNames: []
            }
            gatherOutputNames(snippetList, context);
            context.iterateIdentifier = getFreeName("i", context);
            if(context.mode == SNIPPET_CONVERTER_MODE.GLSL_VS){
                context.envName = getFreeName("env", context);
            }
            var ast = connectSnippets(snippetList, context);
            ast = getProgram(ast, context);
            var result = {
                ast: ast,
                argTypes: null
            };
            addArgTypes(result, context);
            return result;
        }
    });

    function gatherOutputNames(snippetList, context){
        var i = snippetList.entries.length;
        while(i--){
            var entry = snippetList.entries[i];
            var j = entry.outputInfo.length;
            while(j--){
                var outputInfo = entry.outputInfo[j];
                if(outputInfo.isFinal()){
                    var name = getFreeName(outputInfo.name, context);
                    context.transferInputNameMap[i + "_" + j] = {
                        name: name,
                        finalOutput: true
                    };
                    context.outputNameMap[outputInfo.finalOutputIndex] = {
                        name: name,
                        type: outputInfo.type
                    };
                }
            }
        }
    }

    function connectSnippets(snippetList, context){
        var ast = { type: Syntax.BlockStatement, body: []};
        for(var i = 0; i < snippetList.entries.length; ++i){
            var entry = snippetList.entries[i];
            var snippedContext = {
                outputMap: createOutputMap(entry, i, context),
                inputMap: createInputMap(entry, context),
                temporaryMap: {}
            };
            addSnippedAst(ast.body, entry, snippedContext, context );
        }
        return ast;
    }

    function getProgram(ast, context){
        var params = [];
        if(context.mode == SNIPPET_CONVERTER_MODE.GLSL_VS){
            params.push({type: Syntax.Identifier, name: context.envName})
        }
        else{
            for(var i = 0; i < context.outputNameMap.length; ++i){
                var name = context.outputNameMap[i].name;
                params.push({type: Syntax.Identifier, name: name});
            }
            for(var i = 0; i < context.directInputNameMap.length; ++i){
                var name = context.directInputNameMap[i].name;
                params.push({type: Syntax.Identifier, name: name});
            }
        }
        var body = ast;
        if(context.mode == SNIPPET_CONVERTER_MODE.JS_ITERATE){
            var iterMax = getFreeName("maxIter", context);
            params.push({type: Syntax.Identifier, name: iterMax});
            body = { type: Syntax.BlockStatement,
                body: [
                    {type: Syntax.VariableDeclaration, "kind": "var", declarations: [
                        {type: Syntax.VariableDeclarator,
                            id: {type: Syntax.Identifier, name: context.iterateIdentifier},
                            init: {type: Syntax.Identifier, name: iterMax}
                        }
                    ]},
                    {type: Syntax.WhileStatement,
                        test: {type: Syntax.UpdateExpression, operator: "--",
                            argument: {type: Syntax.Identifier, name: context.iterateIdentifier}},
                        body: ast
                    }
                ]
            };
        }
        addBodyDeclarations(body, context);
        return { type: Syntax.Program, body: [{
            type: Syntax.FunctionDeclaration,
            id: {type: Syntax.Identifier, name: "main"},
            params: params,
            defaults: [],
            body: body
        }]};
    }
    function addArgTypes(result, context){
        var argTypes = [];
        if(context.mode == SNIPPET_CONVERTER_MODE.GLSL_VS){

            var attribs = {};
            var outputIndices = {},
                inputIndices = {};

            for(var i = 0; i < context.outputNameMap.length; ++i){
                var entry = context.outputNameMap[i];
                var type = Base.deepExtend({}, entry.type);
                type.source = "vertex";
                type.output = true;
                attribs[entry.name] = type;
                outputIndices[entry.name] = i;
            }
            for(var i = 0; i < context.directInputNameMap.length; ++i){
                var entry = context.directInputNameMap[i];
                if(!entry) continue;
                var type = Base.deepExtend({}, entry.type);
                type.source = entry.iterate ? "vertex" : "uniform";
                attribs[entry.name] = type;
                inputIndices[entry.name] = i;
            }
            var env = { "extra" : {"type": "object", "kind": "any", "global": true, "info": attribs }};
            argTypes.push(env);
            result.outputIndices = outputIndices;
            result.inputIndices = inputIndices;
        }
        else{
            for(var i = 0; i < context.outputNameMap.length; ++i){
                argTypes.push({extra: {type: "array", elements: Base.deepExtend({}, context.outputNameMap[i].type) }});
            }
            for(var i = 0; i < context.directInputNameMap.length; ++i){
                argTypes.push({extra: {type: "array", elements: Base.deepExtend({}, context.directInputNameMap[i].type) }});
            }
            argTypes.push({ extra: {type: "int"}});
        }

        result.argTypes = argTypes;
    }

    function addBodyDeclarations(body, context){
        if(context.declareNames.length == 0)
            return;
        var decl = {type: Syntax.VariableDeclaration, "kind": "var",
            declarations: []};
        for(var i = 0; i < context.declareNames.length; ++i){
            var name = context.declareNames[i];
            decl.declarations.push({type: Syntax.VariableDeclarator,
                    id: {type: Syntax.Identifier, name: name},
                    init: null});
        }
        body.body.unshift(decl);
    }

    function addSnippedAst(dest, entry, snippedContext, context){
        var astBody = walk.replace(entry.ast.body, {
            leave: function(node, parent){
                switch(node.type){
                    case Syntax.Identifier : return handleIdentifierExit(node, parent, snippedContext, context);
                    case Syntax.VariableDeclarator: return handleDeclaratorExit(node, parent, snippedContext, context);
                    case Syntax.BlockStatement: return handleBlockExit(node, parent, snippedContext, context);
                    case Syntax.ReturnStatement: return handleReturnExit(node, parent, snippedContext, context);
                }
            }
        });
        dest.push.apply(dest, astBody.body);
    }


    function handleIdentifierExit(node, parent, snippedContext, context){
        if(parent.type == Syntax.Property && parent.key == node)
            return;
        if(parent.type == Syntax.VariableDeclarator)
            return;
        if(snippedContext.temporaryMap[node.name]){
            return snippedContext.temporaryMap[node.name];
        }
        if(snippedContext.inputMap[node.name]){
            return snippedContext.inputMap[node.name];
        }
    }
    function handleDeclaratorExit(node, parent, snippedContext, context){
        var name = node.id.name;
        var tmpName = getFreeName(name, context);
        context.declareNames.push(tmpName);
        snippedContext.temporaryMap[name] = { type: Syntax.Identifier, name: tmpName};
    }
    function handleBlockExit(node, parent, snippedContext, context){
        var i = node.body.length;
        while(i--){
            if(node.body[i].type == Syntax.VariableDeclaration){
                node.body.splice(i,1);
            }
        }
        return node;
    }
    function handleReturnExit(node, parent, snippedContext, context){
        if(node.argument.type != Syntax.ObjectExpression){
            var outputName;
            for(outputName in snippedContext.outputMap) break;
            return createResultAssignment(outputName, node.argument, snippedContext);
        }
        else{
            var result = { type: Syntax.BlockStatement, body: [] };
            var properties = node.argument.properties;
            var addReturn = null;
            for(var i = 0; i < properties.length; ++i){
                var prop = properties[i];
                var outputName = prop.key.name || prop.key.value;
                if(outputName == "_glPosition"){
                    if(context.mode == SNIPPET_CONVERTER_MODE.GLSL_VS){
                        addReturn = prop.value;
                    }
                }
                else{
                    result.body.push(createResultAssignment(outputName, prop.value, snippedContext));
                }
            }
            if(addReturn){
                result.body.push({
                    type: Syntax.ReturnStatement,
                    argument: addReturn
                })
            }
            return result;
        }
    }

    function createResultAssignment(name, value, snippedContext){
        return {
            type: Syntax.ExpressionStatement, expression: {
                type: Syntax.AssignmentExpression, operator: "=",
                left: Base.deepExtend({}, snippedContext.outputMap[name]),
                right: value
            }
        };
    }


    function createInputMap(entry, context){
        var result = {};
        var inputInfo = entry.inputInfo,
            params = entry.ast.params;
        for(var i = 0; i < inputInfo.length; ++i){
            var info = inputInfo[i];
            var paramName = params[i].name;
            result[paramName] = getInputAst(paramName, info, context);
        }
        return result;
    }

    function getInputAst(name, info, context){
        var actualName, pureTransfer = false;
        if(info.isTransferInput()){
            var entry = context.transferInputNameMap[info.getTransferInputKey()];
            actualName = entry.name;
            pureTransfer = !entry.finalOutput;
        }
        else{
            var index = info.directInputIndex;
            if(!context.directInputNameMap[index]){
                var type = info.type;
                if(info.arrayAccess){
                    type = {type: "array", elements: type, staticSize: info.arraySize };
                }
                context.directInputNameMap[index] = {
                    name: getFreeName(name, context),
                    type: type,
                    iterate: info.iterate
                };
            }
            actualName = context.directInputNameMap[index].name;
        }
        var ast = {type: Syntax.Identifier, name: actualName};
        if(!pureTransfer){
            ast = getParamAccessAst(ast, info.arrayAccess, info.iterate, context);
        }

        return ast
    }

    function createOutputMap(entry, operatorIndex, context){
        var result = {};
        var outputInfo = entry.outputInfo;
        for(var i = 0; i < outputInfo.length; ++i){
            var info = outputInfo[i];
            var paramName = outputInfo[i].name;
            result[paramName] = getOutputAst(paramName, info, operatorIndex, i, context);
        }
        return result;
    }

    function getOutputAst(name, info, operatorIndex, outputIndex, context){
        var actualName, final;
        if(info.isFinal()){
            final = true;
            actualName = context.outputNameMap[info.finalOutputIndex].name;
        }else{
            actualName = getFreeName(name, context);
            context.transferInputNameMap[operatorIndex + "_" + outputIndex] = {
                name: actualName,
                finalOutput: false
            };
            context.declareNames.push(actualName);
        }
        var ast = {type: Syntax.Identifier, name: actualName};
        if(final){
            ast = getParamAccessAst(ast, false, true, context);
        }
        return ast
    }

    function getParamAccessAst(ast, arrayAccess, iterate, context){
        if(context.mode == SNIPPET_CONVERTER_MODE.JS_ITERATE && !arrayAccess){
            return { type: Syntax.MemberExpression, computed: true,
                    object: ast, property: ( iterate ?
                        {type: Syntax.Identifier, name: context.iterateIdentifier} :
                        {type: Syntax.Literal, value: 0, raw: "0"})
                  };
        }
        else if(context.mode == SNIPPET_CONVERTER_MODE.GLSL_VS){
            return { type: Syntax.MemberExpression,
                    object: {type: Syntax.Identifier, name: context.envName},
                    property: ast
            };
        }
    }

    function getFreeName(name, context){
        var test = name, i = 1;
        while(context.blockedNames.indexOf(test) != -1){
            test = name + "_" + (++i);
        }
        context.blockedNames.push(test);
        return test;
    }

    ns.connectSnippets = function (snippedList, opt) {
        var funcArgWriteDuplicator = new SnippetConnector();
        return funcArgWriteDuplicator.execute(snippedList, opt.mode || SNIPPET_CONVERTER_MODE.JS_ITERATE);
    };
    ns.MODE = SNIPPET_CONVERTER_MODE

}(exports));

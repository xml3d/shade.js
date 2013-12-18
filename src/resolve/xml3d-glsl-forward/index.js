(function (ns) {

    var ClosuresImpl = require("./xml3d-forward.js"),
        LightLoop = require("./light-loop.js").LightLoop,
        Traversal = require('estraverse'),
        Syntax = Traversal.Syntax,
        parser = require('esprima'),
        Shade = require("../../interfaces.js"),
        ANNO = require("./../../base/annotation.js").ANNO,
        sanitizer = require("./../../analyze/sanitizer/sanitizer.js");

    var SpaceTransformTools = require("../../generate/space/space-transform-tools.js");



    function containsClosure(arr, name) {
        return arr.some(function (func) {
            return func.id.name == name;
        });
    }

    function getInjectAddition(destName, functionName, inputPre, ccName, colorClosureIndex ){
        var args = [];
        for(var i = 0; i < inputPre.length; ++i){
            args.push({ type: Syntax.Identifier, name: inputPre[i]});
        }
        var inputsCnt = Shade.ColorClosures[ccName].input.length;
        for(var i = 0; i < inputsCnt; ++i){
            args.push({ type: Syntax.Identifier, name: getColorClosureInputArg(colorClosureIndex, i)});
        }
        return {
            type: Syntax.ExpressionStatement,
            expression: { type: Syntax.AssignmentExpression,
                operator: "=",
                left: { type: Syntax.Identifier, name: destName},
                right: { type: Syntax.CallExpression,
                    callee: { type: Syntax.MemberExpression,
                        object: {type: Syntax.Identifier, name: destName},
                        property: {type: Syntax.Identifier, name: "add"}
                    },
                    arguments: [{ type: Syntax.CallExpression,
                        callee: {type: Syntax.Identifier, name: functionName},
                        arguments: args
                    }]
              }}
        };
    }

    function getColorClosureInject(ccName, functionMember, state){
        if(!ClosuresImpl[ccName])
            console.error("No implementation available for ColorClosure '" + ccName + "'" );
        if(!ClosuresImpl[ccName][functionMember])
            return null;
        var functionName = ccName + "_" + functionMember;
        if (!containsClosure(state.newFunctions, functionName)){
            var closureImplementation = ClosuresImpl[ccName][functionMember];
            try {
                var closureAST = parser.parse(closureImplementation.toString(), { raw: true });
                closureAST = sanitizer.sanitize(closureAST);
                closureAST.body[0].id.name = functionName;
                state.newFunctions.push(closureAST.body[0]);
            } catch (e) {
                console.error("Error in analysis of closure '", ccName + ">" + functionMember, "'", e);
                return;
            }
        }
        return functionName;
    }


    function injectBrdfEntry(ccNames, state){
        var result = {
            type: Syntax.BlockStatement,
            body: []
        };
        for(var i = 0; i < ccNames.length; ++i){
            var fName, ccName = ccNames[i];
            if(fName = getColorClosureInject(ccName, "getDiffuse", state)){
                result.body.push(getInjectAddition("kd", fName, ["L", "V"], ccName, i));
            }
            if(fName = getColorClosureInject(ccName, "getSpecular", state)){
                result.body.push(getInjectAddition("ks", fName, ["L", "V"], ccName, i));
            }
        }
        return result;
    }

    function injectAmbientEntry(ccNames, state){
        var result = {
            type: Syntax.BlockStatement,
            body: []
        };
        for(var i = 0; i < ccNames.length; ++i){
            var fName, ccName = ccNames[i];
            if(fName = getColorClosureInject(ccName, "getAmbient", state)){
                result.body.push(getInjectAddition("ambientColor", fName, ["ambientIntensity"], ccName, i));
            }
        }
        return result;
    }

    function injectColorClosureCalls(lightLoopFunction, ccNames, state){
        var result = Traversal.replace(lightLoopFunction.body, {
            enter: function(node, parent){
                if(node.type == Syntax.ExpressionStatement && node.expression.type == Syntax.Literal){
                    switch(node.expression.value){
                        case "BRDF_ENTRY": return injectBrdfEntry(ccNames, state);
                        case "AMBIENT_ENTRY": return injectAmbientEntry(ccNames, state);
                    };

                }
            }
        });
        return result;
    }

    function getColorClosureInputArg(ccIndex, inputIndex){
        return "_cc" + ccIndex + "Input" + inputIndex;
    }

    function createLightLoopFunction(lightLoopFunctionName, ccNames, state){
        try {
            var lightLoopAst = parser.parse(LightLoop.toString(), { raw: true });
        } catch (e) {
            console.error("Error in analysis of the lightLoop", e);
            return;
        }
        var functionAast = lightLoopAst.body[0];
        functionAast.id.name = lightLoopFunctionName;

        for(var i = 0; i < ccNames.length; ++i){
            var ccName = ccNames[i];
            var ccInput = Shade.ColorClosures[ccName].input;
            for(var j = 0; j < ccInput.length; ++j){
                functionAast.params.push({
                    type: Syntax.Identifier,
                    name: getColorClosureInputArg(i,j)
                });
            }
        }
        injectColorClosureCalls(functionAast, ccNames, state);

        lightLoopAst = sanitizer.sanitize(lightLoopAst);
        return lightLoopAst.body[0];
    }

    function getLightLoopFunction(colorClosureList, state){
        var ccNames = [];
        for(var i = 0; i < colorClosureList.length; ++i)
            ccNames.push(colorClosureList[i].name);
        var lightLoopFunctionName = "lightLoop_" + ccNames.join("_");
        if (!containsClosure(state.newFunctions, lightLoopFunctionName)){
            state.newFunctions.push(createLightLoopFunction(lightLoopFunctionName, ccNames, state));
        }
        return lightLoopFunctionName;
    }

    function handleCallExpression(node, state, colorClosureList) {
        var callee = ANNO(node.callee);
        // console.log("Call", node.callee.property, callee.getTypeString(), node.callee.object)
        if(callee.isOfKind(Shade.OBJECT_KINDS.COLOR_CLOSURE)) {
            ANNO(node).copy(callee);
            colorClosureList.push({ name: node.callee.property.name, args: node.arguments });
        }
    }

    function handleNewExpression(node, state, parent) {
        if (node.callee.name == "Shade") {
            var result = ANNO(node);
            result.setType(Shade.TYPES.OBJECT, Shade.OBJECT_KINDS.COLOR_CLOSURE);
            //console.log(parent);
        }
    }

    function handleMemberExpression(node, state, parent) {
        var object = ANNO(node.object);
        var result = ANNO(node);
        if (object.isOfKind(Shade.OBJECT_KINDS.COLOR_CLOSURE)) {
            var closureName = node.property.name;
            if (!ClosuresImpl.hasOwnProperty(closureName)) {
                console.error("No implementation for closure '", closureName, "'");
                return;
            };
            result.copy(object);
        }
    }

    function getClosureList(returnAast, state){
        var colorClosureList = [];
        var list = Traversal.traverse(returnAast, {
            leave: function(node, parent){
                 switch (node.type) {
                    case Syntax.CallExpression:
                        return handleCallExpression(node, state, colorClosureList);
                    case Syntax.NewExpression:
                        return handleNewExpression(node, state, parent);
                    case Syntax.MemberExpression:
                        return handleMemberExpression(node, state, parent);
                }
            }
        });
        colorClosureList.sort(function (a, b){ return a.name < b.name ? -1 : a.name > b.name ? 1 : 0 });
        return colorClosureList;
    }

    function generateLightLoopCall(lightLoopFunction, colorClosureList, state){
        var args = [];

        var posArg = state.positionArg;
        if(!state.noSpaceTransform)
            posArg = SpaceTransformTools.getSpaceTransformCall(posArg, Shade.SpaceVectorType.VIEW_POINT);
        args.push(posArg)
        args.push(state.ambientArg);
        for(var i = 0; i < colorClosureList.length; ++i){
            var ccEntry = colorClosureList[i];
            var ccInput = Shade.ColorClosures[ccEntry.name].input;
            for(var j = 0; j < ccEntry.args.length; ++j){
                var arg = ccEntry.args[j];
                if(ccInput[j].semantic == Shade.SEMANTICS.NORMAL && !state.noSpaceTransform)
                    arg = SpaceTransformTools.getSpaceTransformCall(arg, Shade.SpaceVectorType.VIEW_NORMAL);
                args.push(arg);
            }
        }
        return {
            type: Syntax.ExpressionStatement,
            expression: {type: Syntax.CallExpression,
                callee: {type: Syntax.Identifier, name: lightLoopFunction},
                arguments: args
            }
        };
    }

    function handleReturnStatement(returnAast, state){
        var list = getClosureList(returnAast, state);
        if(list.length == 0)
            return null;
        var lightLoopFunction = getLightLoopFunction(list, state);
        var lighLoopCall = generateLightLoopCall(lightLoopFunction, list, state);
        returnAast.argument = lighLoopCall;
    }


    function replaceReturnStatements(programAast, state){
        var result = Traversal.replace(programAast, {
            enter: function(node, parent){
                 switch (node.type) {
                    case Syntax.ReturnStatement:
                        this.skip();
                        return handleReturnStatement(node, state);
                }
            }
        });
        return result;
    }

    function getEnvParameter(property){
        return { type: Syntax.MemberExpression,
                object: { type: Syntax.Identifier, name: "_env" },
                property: { type: Syntax.Identifier, name: property}};
    }

    ns.resolvePreTypeInference = function (ast, processData, opt) {
        var state = {
            positionArg: opt && opt.lightLoopPositionArg || null,
            ambientArg: opt && opt.lightLoopAmbientArg || null,
            noSpaceTransform: opt && opt.lightLoopNoSpaceTransform || false,
            program: ast,
            newFunctions: []
        }
        if(!state.positionArg)
            state.positionArg = getEnvParameter("position");
        if(!state.ambientArg)
            state.ambientArg = { type: Syntax.LogicalExpression, operator: "||",
                                 left: getEnvParameter("ambientIntensity"),
                                 right: {type: Syntax.Literal, value: 0} };

        ast = replaceReturnStatements(ast, state);

        state.newFunctions.forEach(function(newFunction) {
            state.program.body.unshift(newFunction);
        })

        return ast;
    }

}(exports));

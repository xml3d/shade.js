(function (ns) {

    var Base = require("../../base/index.js"),
        Traversal = require('estraverse'),
        Syntax = Traversal.Syntax,
        ANNO = require("./../../base/annotation.js").ANNO;
    var Shade = require("../../interfaces.js"),
        Types = Shade.TYPES,
        Kinds = Shade.OBJECT_KINDS;

    var ArgStorageType = {
        FLOAT1 : 'float1',
        FLOAT1_BYTE: 'float1Byte',
        FLOAT1_UBYTE: 'float1UByte',
        FLOAT2: 'float2',
        FLOAT3: 'float3',
        FLOAT3_NORMAL: 'float3Normal',
        FLOAT4: 'float4'
    }


    ns.ColorClosureSignature = function(){
        this.id = 0;
        this.textureCount = 0;
        this.args = [];
        this.colorClosures = [];
    };
    Base.extend(ns.ColorClosureSignature.prototype, {
        construct: function(returnAast, scope){
            var closureInfo = collectClosureInfo(returnAast);
            var argAast = gatherClosureArgs(this, closureInfo, scope);
            var textures = allocateArgumentsToTextures(this);
            this.id = getSignatureId(this);
            argAast[0].value = this.id; // Set ID for shader id assignment
            return generateAast(textures, argAast);
        }
    });

    // Basic ColorClosureSignature Createion

    function addColorClosure(ccSig, colorClosureName, argIndices, envIndices){
        ccSig.colorClosures.push({
            name: colorClosureName,
            argIndices: argIndices,
            envIndices: envIndices
        });
    }

    function addArgument(ccSig, type, kind, storeType){
        var id = ccSig.args.length;
        ccSig.args.push({
            id: id,
            type: type,
            kind: kind,
            storeType: storeType,
            texIdx: undefined,
            componentIdx: undefined,
            bitIdx: undefined
        });
        return id;
    }

    // Argument Collection

    function collectClosureInfo(returnAast){
        var result = [];
        Traversal.traverse(returnAast, {
                leave: function(node, parent){
                    switch (node.type) {
                        case Syntax.CallExpression:
                            if(node.callee.type == Syntax.MemberExpression
                               && ANNO(node.callee.object).isOfKind(Kinds.COLOR_CLOSURE))
                            {
                                result.push({
                                    name: node.callee.property.name,
                                    args: node.arguments
                                });
                            }
                    }
                }
            });
        result.sort(function(a,b){return a.name < b.name ? -1 : a.name > b.name ? 1 : 0});
        return result;
    }

    function gatherClosureArgs(ccSig, closureInfo, scope){
        var argCache = {}, argAast = [];

        // Add argument for signature id;
        getCachedArgument(ccSig, {type: Types.INT}, {type: "Literal", value: "ID_UNSPECIFIED"}, argCache, argAast);

        for(var i = 0; i < closureInfo.length; ++i){
            var cInfo = closureInfo[i];
            var closureDefinition = Shade.ColorClosures[cInfo.name];
            if(!closureDefinition)
                throw new Error("Unknown Color closure '" + cInfo.name + "'");
            var argIndices = [], value;
            for(var i = 0; i < closureDefinition.input.length; ++i){
                var inputDefinition = closureDefinition.input[i];
                if(i < cInfo.args.length)
                    value = cInfo.args[i];
                else
                    value = getDefaultValue(inputDefinition);
                argIndices.push(getCachedArgument(ccSig, inputDefinition, value, argCache, argAast));
            }
            var envIndices = {};
            for(var property in closureDefinition.env){
                var envDefinition = closureDefinition.env[property];
                // TODO: Determine if env property is undefined and use defaultValue in this case;
                if(true){
                    value = getEnvAccess(property, envDefinition);
                }
                else{
                    value = getDefaultValue(envDefinition);
                }
                envIndices[property] = getCachedArgument(ccSig, envDefinition, value, argCache, argAast);
            }
            addColorClosure(ccSig, cInfo.name, argIndices, envIndices);
       }
       return argAast;
    }

    function getCachedArgument(ccSig, inputDefinition, inputAast, argCache, argAast){
        var storageType = getStorageType(inputDefinition);
        var key = storageType + ";" + JSON.stringify(inputAast);
        if(argCache[key] === undefined){
            var argId = addArgument(ccSig, inputDefinition.type, inputDefinition.kind, storageType);
            argCache[key] = argId;
            argAast.push(inputAast);
        }
        return argCache[key];
    }

    function getStorageType(closureInputType){
        if(closureInputType.type == Types.NUMBER || closureInputType.type == Types.INT){
            return ArgStorageType.FLOAT1;
        }
        else if(closureInputType.type == Types.OBJECT){
            switch(closureInputType.kind){
                case Kinds.FLOAT2: return ArgStorageType.FLOAT2;
                case Kinds.FLOAT3: return ArgStorageType.FLOAT3;
                case Kinds.FLOAT4: return ArgStorageType.FLOAT4;
                default:
                    throw new Error("Deferred input of this kind not supported: " + closureInputType.kind);
            };
        }
        else{
            throw new Error("Deferred input of this type not supported: " + closureInputType.type);
        }
    }

    function getEnvAccess(property, definition){
        var result = {
            type: Syntax.MemberExpression,
            object: {type: Syntax.Identifier, name: "_env" },
            property: {type: Syntax.Identifier, name: property }
        }
        ANNO(result).setType(definition.type, definition.kind);
        var objAnno = ANNO(result.object);
        objAnno.setType(Types.OBJECT, Kinds.ANY);
        objAnno.setGlobal(true);
        return result;
    }

    function getDefaultValue(definition){
        if(definition.defaultValue == undefined)
            throw new Error("ColorClosure input has not default value!");

        if(definition.type == Types.NUMBER || definition.type == Types.INT){
            var result = {
                type: Syntax.Literal,
                value: definition.defaultValue
            }
            ANNO(result).setType(Types.NUMBER);
            return result;
        }
        else{
            throw new Error("Currentlty don't support default values of type " + definition.type + " and kind " + definition.kind);
        }
    }


    // Argument Allocation


    function allocateArgumentsToTextures(ccSig){
        var argCopy = ccSig.args.slice();
        argCopy.sort(function(a, b){
            return getStorageSize(a.storeType) - getStorageSize(b.storeType);
        });
        var textures = [];
        var i = argCopy.length;
        while(i--){
            var arg = argCopy[i];
            assignTextureSlot(arg, textures);
        }
        ccSig.textureCount = textures.length;
        return textures;
    }
    function assignTextureSlot(arg, textures){
        var size = getStorageSize(arg.storeType);
        for(var i = 0; i < textures.length; i++){
            var tex = textures[i];
            if(size < 32){
                throw new Error("We currently don't support storing of values smaller than 32 bit");
            }
            else if(tex.usedComponents + size / 32 <= 4){
                arg.texIdx = i;
                arg.componentIdx = tex.usedComponents;
                arg.bitIdx = 0;
                tex.usedComponents += size / 32;
                tex.usedBits = 0;
                tex.storedArgs.push(arg);
                return;
            }
        }
        arg.texIdx = textures.length;
        arg.componentIdx = 0;
        arg.bitIdx = 0;
        if(size < 32){
            throw new Error("We currently don't support storing of values smaller than 32 bit");
        }
        else{
            textures.push({
                usedComponents: size / 32,
                usedBits: 0,
                storedArgs: [arg]
            });
        }
    }

    function getStorageSize(storeType){
        switch(storeType){
            case ArgStorageType.FLOAT1: return 32;
            case ArgStorageType.FLOAT1_BYTE: return 8;
            case ArgStorageType.FLOAT1_UBYTE: return 8;
            case ArgStorageType.FLOAT2: return 64;
            case ArgStorageType.FLOAT3: return 96;
            case ArgStorageType.FLOAT3_NORMAL: return 24;
            case ArgStorageType.FLOAT4: return 128;
        }
    }

    // Get ColorClosureSignature ID

    var c_SignatureNextId = 0;
    var c_SignatureIDCache = {};

    function getSignatureId(ccSig){
        var key = "";
        for(var i = 0; i < ccSig.args.length; ++i){
            var arg = ccSig.args[i];
            key += getArgumentKey(arg) + ";"
        }
        for(i = 0; i < ccSig.colorClosures.length; ++i){
            var closure = ccSig.colorClosures[i];
            key += closure.name + "," + closure.argIndices.join(",");
            for(var prop in closure.envIndices){
                key += "," + prop + ">" + closure.envIndices[i];
            }
        }
        if(c_SignatureIDCache[key] === undefined){
            c_SignatureIDCache[key] = c_SignatureNextId;
            c_SignatureNextId++;
        }
        return c_SignatureIDCache[key];

    }

    function getArgumentKey(arg){
        return arg.type + "," + arg.kind + "," + arg.storeType + "," + arg.texIdx + ","
            + arg.componentIdx + "," + arg.bitIdx;
    }

    // Aast generation

    function generateAast(textures, argAast){
        var arrayExpression = { type: Syntax.ArrayExpression, elements: []};
        for(var i = 0; i < textures.length; ++i){
            var vectorExpression = generateVectorAast(textures[i], argAast);
            arrayExpression.elements.push(vectorExpression);
        }
        ANNO(arrayExpression).setType(Types.ARRAY);

        var returnStatement = {type: Syntax.ReturnStatement, argument: arrayExpression};
        return returnStatement;
    }

    function generateVectorAast(texture, argAast){
        var vecArgs = [];
        for(var i = 0; i < texture.storedArgs.length; ++i){
            var arg = texture.storedArgs[i];
            var size = getStorageSize(arg.storeType);
            if(size < 32){
                throw new Error("We currently don't support storing of values smaller than 32 bit");
            }
            else{
                vecArgs.push(argAast[arg.id]);
            }
        }
        for(i = texture.usedComponents; i < 4; ++i){
            var zeroLiteral = { type: Syntax.Literal, value: "0" };
            ANNO(zeroLiteral).setType(Types.NUMBER);
        }
        var result = { type: Syntax.NewExpression, callee: { type: Syntax.Identifier, name: "Vec4"}, arguments: vecArgs};
        ANNO(result).setType(Types.OBJECT, Kinds.FLOAT4);
        return result;
    }


}(exports));

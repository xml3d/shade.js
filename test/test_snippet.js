var esprima = require('esprima');
var esgraph = require('esgraph');
var analyses = require('analyses');
var map = require('es6-map-shim');
var codegen = require("escodegen");
var Shade = require("..");
var walk = require('estraverse');
var Syntax = walk.Syntax;
var fs = require('fs');
var should = require('chai').Should();
var Compiler = require("../src/generate/glmatrix/compiler.js").GLMatrixCompiler;

var SnippetList = require("../src/generate/snippets/snippet-list").SnippetList;
var SnippetEntry = require("../src/generate/snippets/snippet-list").SnippetEntry;
var SnippetConnector = require("../src/generate/snippets/snippet-connector");

function createSnippetList(connection, snippetFunctions){
    var list = new SnippetList();
    for(var i = 0; i < connection.length; ++i){
        var entry = connection[i];
        var code = snippetFunctions[entry.code];
        var snippetEntry = new SnippetEntry(code);
        addEntryInput(snippetEntry, entry);
        addEntryOutput(snippetEntry, entry);
        list.addEntry(snippetEntry);
    }
    return list;
}

function addEntryInput(dest, src){
    for(var i = 0; i < src.input.length; ++i){
        var entry = src.input[i];
        if(entry.directInputIndex !== undefined){
            dest.addDirectInput(entry.type, entry.iterate, entry.arrayAccess, entry.directInputIndex);
        }
        else{
            dest.addTransferInput(entry.type, entry.arrayAccess, entry.transferOperator, entry.transferOutput);
        }
    }
}

function addEntryOutput(dest, src){
    for(var i = 0; i < src.output.length; ++i){
        var entry = src.output[i];
        if(entry.finalOutputIndex !== undefined){
            dest.addFinalOutput(entry.type, entry.name, entry.finalOutputIndex);
        }
        else{
            dest.addLostOutput(entry.type, entry.name);
        }
    }
}

function extractSnippetFunctions(ast){
    var result = {};
    var properties = ast.expression.right.properties;
    var i = properties.length;
    while(i--){
        var key = properties[i].key.name;
        var method = properties[i].value;
        result[key] = method;
    }
    return result;
}

function createTest(dir, file) {
    if(fs.lstatSync(dir + file).isDirectory())
        return;
    var contents = fs.readFileSync(dir + file, 'utf8');
    var ast = esprima.parse(contents, {comment: true, range: true});
    var comments = ast.comments;
    delete ast.comments;
    var description = comments[0].value.trim() + ' (' + file + ')';
    var connection = JSON.parse(comments[1].value);
    var jsInfo = JSON.parse(comments[2].value);
    var glslInfo = JSON.parse(comments[3].value);
    var snippetsFunctions = extractSnippetFunctions(ast.body[0]);
    it(description, function () {
        var outputJs = {
                type: Syntax.Program,
                body: ast.body[1].body
            };
        outputJs.body[0].id.name = "main";
        var outputGLSL = {
                type: Syntax.Program,
                body: ast.body[2].body
            };
        outputGLSL.body[0].id.name = "main";

        var snippetList = createSnippetList(connection, snippetsFunctions);
        var resultJs = SnippetConnector.connectSnippets(snippetList, {mode: SnippetConnector.MODE.JS_ITERATE});
        var compiledCode = codegen.generate(resultJs.ast);
        var expectedCode = codegen.generate(outputJs);
        compiledCode.should.eql(expectedCode);
        resultJs.argTypes.should.deep.equal(jsInfo.argTypes);


        snippetList = createSnippetList(connection, snippetsFunctions);
        var resultGLSL = SnippetConnector.connectSnippets(snippetList, {mode: SnippetConnector.MODE.GLSL_VS});
        compiledCode = codegen.generate(resultGLSL.ast);
        expectedCode = codegen.generate(outputGLSL);
        compiledCode.should.eql(expectedCode);
        resultGLSL.argTypes.should.deep.equal(glslInfo.argTypes);
        resultGLSL.inputIndicies.should.deep.equal(glslInfo.inputIndicies);
    });
}

describe('Snippet Connection:', function () {

    var dir = __dirname + '/data/snippet/';

//    createTest(dir, "swizzles.js");

    var files = fs.readdirSync(dir);
    files.forEach(function (file) {
        createTest(dir, file);
    });

});

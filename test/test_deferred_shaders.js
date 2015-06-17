var esprima = require('esprima');
var Shade = require("..");
var fs = require('fs');
var should = require('should');
var GLSLCompiler = require("../src/generate/glsl/compiler").GLSLCompiler,
    ColorClosureSignature = require("../src/resolve/xml3d-glsl-deferred/color-closure-signature.js").ColorClosureSignature;



function createTest(dir, file) {
    var filename = dir + file;
    var contents = fs.readFileSync(filename, 'utf8');
    var ast = esprima.parse(contents, {comment: true, range: true, raw: true});
    var comments = ast.comments;
    delete ast.comments;

    var ctx = filename.replace(/\.[^/.]+$/, "") + "-context.json";
    var contextData = {};
    if (fs.existsSync(ctx)) {
        contextData = JSON.parse(fs.readFileSync(ctx, "utf-8"));
    }
    var ccSigPath = filename.replace(/\.[^/.]+$/, "") + "-ccsig.json";
    var ccSigExpected = null;
    if(fs.existsSync(ccSigPath)){
        ccSigExpected = JSON.parse(fs.readFileSync(ccSigPath, "utf-8"));
    }

    it(comments[0].value.trim() + ' (' + file + ')', function () {
        ColorClosureSignature.clearIdCache();
        var workingSet = new Shade.WorkingSet();
        workingSet.setAst(ast);
        workingSet.analyze(contextData, "xml3d-glsl-deferred",
            {entry: "global.shade", propagateConstants: false, validate: true, sanitize: false});
        var result = workingSet.compileFragmentShader({useStatic: true, omitHeader: true});

//        var aast = Shade.parseAndInferenceExpression(ast, {inject: contextData, entry: "global.shade",
//            propagateConstants: true, validate: true, sanitize: false, implementation: "xml3d-glsl-deferred"});
//        var result = new GLSLCompiler().compileFragmentShader(aast, {useStatic: true, omitHeader: true});
        var actual = result.source.trim();
        var expected = comments[1].value.trim();
        expected = expected.replace(/\r\n/g,"\n");
        //console.log(actual);
        actual.should.eql(expected);
        if(ccSigExpected){
            var colorClosureSigs = workingSet.getProcessingData('colorClosureSignatures');
            compareObject(colorClosureSigs, ccSigExpected, "/");
        }
    });
}

function compareObject(obj, expected, path){
    for(var i in expected){
        var subPath = path + i + "/";
        obj.should.have.property(i);//, undefined, "ColorClosure Sig Check at " + subPath);
        if(typeof expected[i] == "object"){
            obj.should.be.type("object", "ColorClosure Sig Check at " + subPath);
            compareObject(obj[i], expected[i], subPath);
        }
        else{
            if(obj[i] != expected[i]){
                // TODO: Fix this once mocha/shade.js make use of the FRIGGN DESCRIPTION ARGUMENT
                console.log("ColorClosure Sig violation at " + subPath);
                obj[i].should.eql(expected[i], "ColorClosure Sig Check at " + subPath);
            }

        }
    }
}


xdescribe('GLSL Deferred Shader Code:', function () {
    var dir = __dirname + '/data/shaders/deferred/';
    //createTest(dir, "basic.js");

    var files = fs.readdirSync(dir);
    files.filter(function(filename) { return filename.split('.').pop() == "js" }).forEach(function (file) {
        createTest(dir, file);
    });
});

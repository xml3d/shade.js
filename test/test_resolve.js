var Shade = require("..");
var should = require('should');
var GLSLCompiler = require("../src/generate/glsl/compiler").GLSLCompiler;
var addTestDirectory = require("./helpers").addTestDirectory;
var resolver = require("../src/resolve/resolve");
var replacer = require("../src/resolve/colorclosure-replacer.js");
var Syntax = require('estraverse').Syntax;

describe('Resolve Closure:', function () {
    addTestDirectory(__dirname + '/data/resolve/', function (ast, contextData, expected) {
        resolver.registerLightingImplementation("test", {
            resolvePreTypeInference: function () {
                ast = replacer(ast, function (closures) {
                    closures.should.be.instanceof(Array).and.should.not.be.empty;
                    return {
                        type: Syntax.CallExpression, callee: {
                            type: Syntax.Identifier, name: closures.map(function (e) {
                                return e.name
                            }).join("_")
                        }, arguments: closures.reduce(function (prev, curr) {
                            return prev.concat(curr.args)
                        }, [])
                    };
                });
                return ast;
            }
        });

        ast = Shade.resolveClosures(ast, "test");
        var actual = Shade.toJavaScript(ast).trim();
        expected.should.eql(actual);
    });
});

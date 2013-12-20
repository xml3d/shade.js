(function(ns){

    // Dependencies
    var traverse = require('estraverse'),
        common = require("./../../base/common.js"),
        codegen = require('escodegen'),
        setterGenerator = require('./uniformSetterTransformation.js');

    // Shortcuts
    var ANNO = common.ANNO,
        Syntax = traverse.Syntax;

    var UniformTransformer = function(opt){
        opt = opt || {};

        var counter = opt.uniformCounter || 1;
        this.getCounter = function() {
            return counter++;
        };
        this.uniformExpressions = {};
        this.activeUniformVariables = {};
    };

    UniformTransformer.prototype = {
        transform: function(ast) {
            var that = this;
            return traverse.replace(ast, {
                enter: function(node) {
                    var anno = ANNO(node);
                    if(anno.isUniformExpression() && shouldGenerateUniformExpression(node, anno)) {
                        return that.generateUniformExpression(node);
                    }
                    if (node.type == Syntax.AssignmentExpression || (node.type == Syntax.VariableDeclarator && node.init)) {
                        var right = ANNO(node.right || node.init);
                        var leftNode = node.left || node.id;
                        if (right.isUniformExpression() && leftNode.type == Syntax.Identifier) {
                            that.activeUniformVariables[leftNode.name] = {
                                code: setterGenerator.transformUniformSetter(node.right || node.init, that.activeUniformVariables),
                                dependencies: right.getUniformDependencies()
                            }
                        }
                    }
                }
            });
        },
        getUniformExpression: function(uexp) {
            for(var name in this.uniformExpressions) {
                var other = this.uniformExpressions[name];
                if(uexp.code == other.code && equalDependencies(uexp.dependencies, other.dependencies))
                    return name;
            }
            return "";
        },
        generateUniformExpression: function(node) {
            var anno = ANNO(node);
            var uexp = {
                code: codegen.generate(setterGenerator.transformUniformSetter(node, this.activeUniformVariables)),
                dependencies: anno.getUniformDependencies()

            };

            var name = this.getUniformExpression(uexp);
            if(!name) {
                name = "u" + this.getCounter();
                this.uniformExpressions[name] = uexp;
            }
            var result = {
                type: Syntax.MemberExpression,
                object: {
                    type: Syntax.Identifier,
                    name: "uexp"
                },
                property: {
                    type: Syntax.Identifier,
                    name: name
                }
            }

            ANNO(result).copy(anno);
            return result;
        }
    };

    function equalDependencies(a, b) {
        if(a.length != b.length)
            return false;
        a.forEach(function(elem) {
            if(b.indexOf(elem) == -1)
                return false;
        });
        return true;
    }

    function shouldGenerateUniformExpression(node, anno) {
        var deps = anno.getUniformDependencies();

        if(deps.length == 1) {
            // Only depends on itself
            if(node.type == Syntax.MemberExpression && node.property.name == deps[0])
                return false;
        }

        return true;
    };

    var transform = ns.transform = function (ast, opt) {
        var transformer = new UniformTransformer(opt);
        var result = transformer.transform(ast);
        opt.uniformExpressions = transformer.uniformExpressions;
        return result;
    };

}(exports));

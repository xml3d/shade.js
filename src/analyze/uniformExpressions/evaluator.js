(function (ns) {

    // Dependencies
    var traverse = require('estraverse'),
        common = require("./../../base/common.js"),
        Shade = require("../../interfaces.js"),
        codegen = require('escodegen'),
        Set = require('analyses').Set,
        Tools = require('../../base/asttools.js');


    // Shortcuts
    var Syntax = traverse.Syntax, ANNO = common.ANNO;

    function toMap(uniformSet) {
        var result = {};
        uniformSet && uniformSet.forEach(function(entry) {
            result[entry.name] = {
                dependencies: entry.dependencies,
                costs: entry.costs
            };
        });
        return result;
    }

    var allowedMemberCalls = ["Math", "Shade"];

    ns.generateUniformExpressions = function (ast, input) {

        var uniformVariables = toMap(input);

        traverse.traverse(ast, {
            leave: function (node, parent) {
                var result = ANNO(node);
                result.clearUniformDependencies();

                switch (node.type) {

                    // New uniforms can come via the env object
                    case Syntax.MemberExpression:
                        var propertyAnnotation = ANNO(node.property);
                        if (propertyAnnotation.getSource() == Shade.SOURCES.UNIFORM) {
                            result.setUniformDependencies(node.property.name);
                            result.setUniformCosts(0);
                        }
                        break;

                    case Syntax.Identifier:
                        // Not a variable
                        if(!Tools.isVariableReference(node, parent))
                            return;

                        // Not a variable on the right side
                        if(parent.type == Syntax.AssignmentExpression && parent.left == node)
                            return;

                        if(uniformVariables.hasOwnProperty(node.name)) {
                            var propagatedUniform = uniformVariables[node.name];
                            result.setUniformDependencies(propagatedUniform.dependencies);
                            result.setUniformCosts(propagatedUniform.costs);
                        }

                        break;
                    case Syntax.BinaryExpression:
                         var left = ANNO(node.left),
                             right = ANNO(node.right);

                        if (left.canUniformExpression() && right.canUniformExpression()) {
                            result.setUniformDependencies(left.getUniformDependencies(), right.getUniformDependencies());
                            result.setUniformCosts(left.getUniformCosts() + right.getUniformCosts() + 2);
                        }
                        break;
                    case Syntax.UnaryExpression:
                        var argument = ANNO(node.argument);

                        if(argument.isUniformExpression()) {
                            result.setUniformDependencies(argument.getUniformDependencies());
                            result.setUniformCosts(argument.getUniformCosts() + 1);
                        }
                        break;
                    case Syntax.CallExpression:
                        if(node.callee.type == Syntax.MemberExpression) {
                            var object = node.callee.object;
                            var args = node.arguments.map(function(arg) { return ANNO(arg);});

                            if(object.name && ~allowedMemberCalls.indexOf(object.name)) {
                                var dependencies = mergeUniformDependencies(args);
                                if(dependencies) {
                                    result.setUniformDependencies(dependencies);
                                    var costs = args.reduce(function(prev, next) { return prev + next.getUniformCosts(); }, 1);
                                    result.setUniformCosts(costs)
                                }
                            } else {
                                // TODO: CleanCode: Merge with above as soon as all differences are clear
                                var objectAnno = ANNO(object);
                                if(objectAnno.isUniformExpression()) {
                                    var dependencies = mergeUniformDependencies(args);
                                    if (dependencies || args.length == 0) {
                                        result.setUniformDependencies(dependencies, objectAnno.getUniformDependencies());
                                        var costs = args.reduce(function(prev, next) { return prev + next.getUniformCosts(); }, 1);
                                        result.setUniformCosts(costs)
                                    }
                                }  else {
                                    // console.log("No exp:", Shade.toJavaScript(node))
                                }
                            }
                        }
                        break;
                    case Syntax.NewExpression:
                        if(node.callee.type == Syntax.Identifier) {
                            var args = node.arguments.map(function(arg) { return ANNO(arg);});
                            var dependencies = mergeUniformDependencies(args);
                            if(dependencies) {
                                result.setUniformDependencies(dependencies);
                                var costs = args.reduce(function(prev, next) { return prev + next.getUniformCosts(); }, 1);
                                result.setUniformCosts(costs);
                            }
                        }
                        break;

                }
            }
        });

        var result = new Set();
        switch (ast.type) {
            case Syntax.AssignmentExpression:
                var right = ANNO(ast.right);
                if (right.isUniformExpression()) {
                    result.add({ name: ast.left.name, dependencies: right.getUniformDependencies(), costs: right.getUniformCosts() });
                }
                break;
            case Syntax.VariableDeclaration:
                ast.declarations.forEach(function (declaration) {
                    if (declaration.init) {
                        var init = ANNO(declaration.init);
                        if (init.isUniformExpression()) {
                            result.add({ name: declaration.id.name, dependencies: init.getUniformDependencies(), costs: init.getUniformCosts() });
                        }
                    }
                });
                break;
        }
        return result;
    }
    
    
    function atLeastOneArgumentIsUniform(args) {
        var allUniformOrStatic = true,
            oneUniform = false;

        for(var i = 0; i < args.length && allUniformOrStatic; i++) {
            var thisUniform = args[i].isUniformExpression();
            allUniformOrStatic = allUniformOrStatic && (thisUniform || args[i].hasConstantValue());
            oneUniform = oneUniform || thisUniform;
        }
        return allUniformOrStatic && oneUniform;
    };

    function mergeUniformDependencies(args) {
        var uniformDependencies = null;

        if(atLeastOneArgumentIsUniform(args)) {
            uniformDependencies = []
            for(var i = 0; i< args.length;i++) {
                if (args[i].isUniformExpression())        {
                    uniformDependencies = uniformDependencies.concat(args[i].getUniformDependencies());
                }
            }
        }
        return uniformDependencies;
    };

}(exports));

// dependencies
var walker = require('walkes');
var worklist = require('analyses');
var common = require("../../base/common.js");
var codegen = require('escodegen');
var Tools = require("./../settools.js");
var esgraph = require('esgraph');


// shortcuts
var Syntax = common.Syntax;
var Set = worklist.Set;
var ANNO = common.ANNO;

// defines

/**
 * Possible semantics
 * @enum
 * @type {{COLOR: string, NORMAL: string, UNKNOWN: string}}
 */
var Semantic = {
    COLOR: 'color',
    NORMAL: 'normal',
    UNKNOWN: 'unknown'
};


/**
 * @param cfg
 * @param {FlowNode} start
 * @returns {Map}
 */
function compute(cfg, start) {



    var result = worklist(cfg, transferFunction, {
        direction: 'backward',
        start: new Set(),
        merge: worklist.merge(mergeSemantics)
    });
    //Tools.printMap(result, cfg);
    return result;
}

/**
 * @param {Set} input
 * @this {FlowNode}
 * @returns {Set} output with respect to input
 */
function transferFunction(input) {
    if (this.type || !this.astNode) // Start and end node do not influence the result
        return input;

    // Local
    var kill = this.kill = this.kill || Tools.findVariableAssignments(this.astNode);
    var generatedDependencies = this.generate = this.generate || generateSemanticDependencies(this.astNode, kill);
    var generatedSemantics = this.generatedSemantics = this.generatedSemantics || generateNewSemantics(this.astNode);
    //generate && console.log(this.label, generate);

    // Depends on input
    var dependencies = null;
    if (generatedDependencies && generatedDependencies.deps.size) {
        var entry = input.filter(function (elem) {
            return elem.name == generatedDependencies.def;
        });
        if (entry.length) {
            dependencies = new Set();
            generatedDependencies.deps.forEach(function (dep) {
                var obj = {name: dep, type: entry[0].type};
                dependencies.add(obj)
            });
        }
    }

    var killed = new Set();
    kill.forEach(function (toKill) {
        killed = new Set(input.filter(function (elem) {
            return elem.name == toKill;
        }));
    });
    return mergeSemantics(Set.minus(input, killed), mergeSemantics(dependencies, generatedSemantics));
}

/**
 * Special merge function that merges entries with same names
 * to a new entry with top element Semantic.UNKNOWN
 * @param {Set} a
 * @param {Set} b
 * @returns {Set}
 */
function mergeSemantics(a, b) {

    var mergeEntry = function (a, b) {
        return {name: a.name, type: a.type != b.type ? Semantic.UNKNOWN : a.type};
    };

    if (!a && b)
        return new Set(b);
    var s = new Set(a);
    if (b)
        b.forEach(
            function (elem) {
                var name = elem.name;
                var resultA = a.filter(function (other) {
                    return other.name == name
                });

                // Not in A, just add it
                if (!resultA.length) {
                    s.add(elem);
                } else {
                    // In A, and type is different: mergeType
                    if (resultA[0].type !== elem.type) {
                        s.add(mergeEntry(elem, resultA[0]));
                        s.delete(resultA[0]);
                    }
                }
            }
        );
    return s;
}


function generateSemanticDependencies(ast, defs) {

    var defCount = defs.size;
    if (defCount == 0)
        return null;
    if (defCount > 1)
        throw new Error("Code not sanitized, found multiple definitions in one statement");

    return {def: defs.values()[0], deps: evaluateSemanticDependencies(ast)};
}

function evaluateSemanticDependencies(ast) {
    var result = new Set();
    if (!ast && !ast.type) {
        return result;
    }

    walker(ast, {
        AssignmentExpression: function (recurse) {
            recurse(this.right);
        },
        VariableDeclarator: function (recurse) {
            recurse(this.init);
        },
        Identifier: function () {
            result.add(this.name);
        },
        NewExpression: function () {
        },
        MemberExpression: function () {
            if (this.object.type == Syntax.Identifier && this.property.type == Syntax.Identifier) {
                result.add(this.object.name + "." + this.property.name);
            }
        },
        CallExpression: function () {
            if (this.callee.type == Syntax.MemberExpression) {
                var callee = this.callee;
                if (MemberHandlers.hasOwnProperty(callee.object.name)) {
                    var propertyHandler = MemberHandlers[callee.object.name];
                    if (propertyHandler.hasOwnProperty(callee.property.name)) {
                        var handler = propertyHandler[callee.property.name];
                        result = handler(this.arguments, result);
                        return;
                    }
                } else {
                    // Call on env
                    // TODO: This is not safe. Perform on annotated AST
                    if (Vec3Handler.hasOwnProperty(callee.property.name)) {
                        handler = Vec3Handler[callee.property.name];
                        result = handler(callee, this.arguments, result);
                        return;
                    }
                }
                console.log("Unhandled: ", codegen.generate(this))
            }

        }
    });
    return result;
}

function getName(node) {
    switch (node.type) {
        case Syntax.Identifier:
            return node.name;
        case Syntax.MemberExpression:
            return node.object.name + "." + node.property.name;
        default:
            console.error("No name for", codegen.generate(node));
            return "?"
    }
}

// TODO: Support more functions
var MathHandlers = {
    mix: function (args, result) {
        result = Set.union(result, evaluateSemanticDependencies(args[0]));
        result = Set.union(result, evaluateSemanticDependencies(args[1]));
        return result;
    }
};

var Vec3Handler = {
    normalize: function (callee, args, result) {
        result.add(getName(callee.object));
        return result;
    },
    mul: function (callee, args, result) {
        result.add(getName(callee.object));
        result = Set.union(result, evaluateSemanticDependencies(args[0]));
        return result;
    }
};


var MemberHandlers = {
    "Math": MathHandlers
};


function generateNewSemantics(astNode) {
    var result = new Set();

    walker(astNode, {
        CallExpression: function (recurse) {
            if (this.callee.type == Syntax.MemberExpression && isBRDFCall(this.callee.object)) {
                var name = this.callee.property.name;
                //noinspection FallthroughInSwitchStatementJS
                switch (name) {
                    case "diffuse":
                    case "phong":
                        declare(Semantic.COLOR, this.arguments[0], result);
                        declare(Semantic.NORMAL, this.arguments[1], result);
                        break;
                }
                recurse(this.callee);
            } else {
                recurse(this.callee);
                recurse(this.arguments);

            }
        }
    });
    return result;
}

function isBRDFCall(ast) {
    if (!ast) {
        return false;
    }
    if (ast.type == Syntax.NewExpression) {
        return ast.callee.type == Syntax.Identifier && ast.callee.name === "Shade";
    }
    if (ast.type == Syntax.CallExpression && ast.callee.type == Syntax.MemberExpression) {
        return isBRDFCall(ast.callee.object);
    }
    return false;
}

function declare(semantic, astNode, variables) {
    walker(astNode, {
        Identifier: function () {
            ANNO(this).setSemantic(semantic);
            addMerged(variables, {
                name: this.name,
                type: semantic
            });
        },
        MemberExpression: function () {
            if (this.object.type == Syntax.Identifier && this.property.type == Syntax.Identifier) {
                ANNO(this).setSemantic(semantic);
                addMerged(variables, {
                    name: getName(this),
                    type: semantic
                });
            }
        }
    });
}

function addMerged(target, elem) {
    var sameName = target.filter(function (other) {
        return other.name == elem.name;
    });
    if (!sameName.length) {
        target.add(elem);
    } else {
        if (sameName[0].type !== elem.type) {
            target.add({name: elem.name, type: Semantic.UNKNOWN});
            target.delete(sameName[0]);
        }
    }
}

compute.Semantic = Semantic;

module.exports = compute;


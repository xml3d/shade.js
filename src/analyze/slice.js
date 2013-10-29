var walk = require('estraverse');
var worklist = require('analyses');
var common = require("../base/common.js");
var codegen = require('escodegen');
var SetTools = require("./settools.js");
var Set = worklist.Set;

module.exports = slice;

var Syntax = common.Syntax;




function slice(cfg, startNode, variable) {

    if (!findVariableReferences(startNode.astNode).has(variable)) {
        throw new Error("Illegal criterion for slicing: Variable '" + variable + "' not contained in " + codegen.generate(startNode.astNode));
    }

    var dominatorMap = computeInverseDominators(cfg);

    var initialSet = new Set();
    initialSet.add(variable);

    var oldS = new Set(),
        R = directRelevantVariables(cfg, startNode, initialSet, dominatorMap),
        S = getRelevantStatements(cfg),
        B = getRelevantBranchStatements(cfg, S);

    while(!Set.equals(S, oldS)) {
        oldS = S;

        var newR = B.values().reduce(function(input, node) {
            var sR = directRelevantVariables(cfg, node, findVariableReferences(node.astNode));
            return mergeMap(input, sR );
        }, R);

        S =  Set.union(B, getRelevantStatements(cfg));
        B =  getRelevantBranchStatements(cfg, S);
        R = newR;
        //Tools.printMap(cfg, newR);
    }
    //console.log("Statements final:", Tools.getSetLabels(S));
    return S;
}

/**
 *
 * @param {} cfg
 * @param {FlowNode} startNode
 * @param {Set} variables
 * @param {Map} dominatorMap
 * @returns {Map.<FlowNode, Set>}
 */
function directRelevantVariables(cfg, startNode, variables, dominatorMap) {

    var oldStart = cfg[1];
    var oldNext = startNode.next;

    cfg[1] = startNode;
    cfg[1].next = [];

    // console.log("Find direct: ", startNode.label, variables);
    var R = worklist(cfg, function (input) {

        if (this.type || !this.astNode)
            return input;

        // Local
        var ref = this.ref = this.ref || findVariableReferences(this.astNode);
        var def = this.def = this.def || SetTools.findVariableDefinitions(this.astNode);
        this.infl = this.infl || computeInfluence(this, dominatorMap.get(this));

        var result = null;
        if (Set.intersect(def, input).size) {
            this.directRelevant = true;
            result = Set.union(result, ref);
        };

        var generated = new Set(input.values().filter(function (v) {
            return !def.has(v);
        }));
        return Set.union(result, generated);

    }, {direction: 'backward', start: variables});

    cfg[1].next = oldNext;
    cfg[1] = oldStart;
    return R;
}

function getRelevantStatements(cfg) {
    return new Set(cfg[2].filter(function (node) {
        return node.directRelevant === true;
    }));
}
function getRelevantBranchStatements(cfg, S) {
    return new Set(cfg[2].filter(function (node) {
        return node.infl ? Set.intersect(node.infl, S).size : false;
    }));
}

/**
 *
 * @param {Map.<FlowNode, Set>} A
 * @param {Map.<FlowNode, Set>} B
 */
function mergeMap(A, B) {
    var keys = B.keys();
    for(var i in keys) {
        var key = keys[i];
        if(A.has(key)) {
            var setA = A.get(key);
            var setB = B.get(key);
            A.set(key, Set.union(setA, setB));
        }
    }
    return A;
}


function isVariableReference(node, parent) {
    return node.type == Syntax.Identifier &&
        !(parent.type == Syntax.MemberExpression || parent.type == Syntax.FunctionDeclaration || parent.type == Syntax.NewExpression || parent.type == Syntax.VariableDeclarator || (parent.type == Syntax.CallExpression && parent.callee == node));
}

function isMemberReference(node, parent) {
    return node.type == Syntax.MemberExpression && node.object.type == Syntax.Identifier && node.property.type == Syntax.Identifier && !(parent.type === Syntax.CallExpression && parent.callee == node);

}

function getMemberName(node) {
    if(node.object.type == Syntax.Identifier && node.property.type == Syntax.Identifier) {
        return node.object.name + "." + node.property.name;
    }
    throw new Error("Could not determine member name: " + codegen.generate(node) + node.object.type);
}

function findVariableReferences(ast) {
    var references = new Set();
    walk.traverse(ast, {
        leave: function(node, parent) {
            switch(node.type) {
                case Syntax.AssignmentExpression:
                    references = Set.union(references, findVariableReferences(node.right));
                    return walk.VisitorOption.Break;
                    break;
                case Syntax.Identifier:
                    if (isVariableReference(node, parent)) {
                        references.add(node.name);
                    }
                    break;
                case Syntax.MemberExpression:
                    if (isMemberReference(node, parent)) {
                        if (isVariableReference(node.object, node)) {
                            references.add(node.name);
                        }
                        references.add(getMemberName(node));
                    }
                    break;
                case Syntax.CallExpression:
                    if(node.callee.type == Syntax.MemberExpression && parent && parent.type !== Syntax.MemberExpression) {
                        var object = node.callee.object;
                        if (object.type == Syntax.Identifier) {
                            references.add(object.name)
                        }
                    }

                    break;

            }
        }
    })
    return references;
}


var Tools = {

    findSetOfNodesOnPath: function(fromArr, endSet, result) {
        //console.log("Testing: ",  from.label || from.type);
        for(var i = 0; i < fromArr.length; i++) {
            var node = fromArr[i];
            if(!(result.has(node) || endSet.has(node))) {
                result.add(node);
                Tools.findSetOfNodesOnPath(node.next, endSet, result);
            }
        }
    }
}


function computeInfluence(node, inverseDominators) {

    var result = new Set();

    // INFL(node) will be empty unless b has more than one immediate
    // successor (i.e., is a branch statement).
    if (node.next.length < 2)
        return result;

    Tools.findSetOfNodesOnPath(node.next, inverseDominators, result);

    //console.log("INFL(", node.label, "):", Tools.getSetLabels(result))

    return result;
}

function computeInverseDominators(cfg) {
    var result = worklist(cfg, function (input) {

        if (this.type || !this.astNode)
            return input;

        return Set.union(input, new Set([this]));

    }, {direction: 'backward', start: new Set(), merge:  worklist.merge(Set.intersect)});

    //Tools.printMap(cfg, result);
    return result;
}

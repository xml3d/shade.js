var walk = require('estraverse');
var worklist = require('analyses');
var common = require("../base/common.js");
var codegen = require('escodegen');
var Set = worklist.Set;

module.exports = slice;

var Syntax = common.Syntax;

/**
 *
 * @param {} cfg
 * @param {FlowNode} startNode
 * @param {Set} variables
 * @returns {Map.<FlowNode, Set>}
 */
function directRelevantVariables(cfg, startNode, variables) {

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
        var def = this.def = this.def || findVariableDefinitions(this.astNode);
        this.infl = this.infl || computeInfluence(this);

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


function slice(cfg, node, variable) {

    if (!findVariableReferences(node.astNode).has(variable)) {
        throw new Error("Illegal criterion for slicing: Variable '" + variable + "' not contained in " + codegen.generate(node.astNode));
    }

    var initialSet = new Set();
    initialSet.add(variable);

    var oldS = new Set(),
        R = directRelevantVariables(cfg, node, initialSet),
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
            }
        }
    })
    return references;
}

function findVariableDefinitions(ast) {
    var definitions = new Set();
    walk.traverse(ast, {
        leave: function(node, parent) {
            switch(node.type) {
                case Syntax.AssignmentExpression:
                    if (node.left.type == Syntax.Identifier) {
                        definitions.add(node.left.name);
                    }
                    break;
                case Syntax.VariableDeclarator:
                    if (node.id.type == Syntax.Identifier) {
                        definitions.add(node.id.name);
                    }
                    break;
            }
        }
    })
    return definitions;
}

var Tools = {

    findSetOfNodesOnPath: function(from, to, includeToNode) {
        // Reached start or end node and this is not a valid path
        if (from.type) {
            return null;
        }

        // Found destination
        if (from == to)  {
            return includeToNode == true ? new Set([from]) : new Set();
        }

        var result = null;
        for(var i = 0; i < from.prev.length; i++) {
            var predecessor = from.prev[i];
            var path = Tools.findSetOfNodesOnPath(predecessor, to, !!includeToNode);
            if (path) {
                result = result ||  new Set([from]);
                result = Set.union(result, path);
            }
        }
        //console.log("findSetOfNodesOnPath from", from.label, "to", to.label, Tools.getSetLabels(result) );
        return result;
    },

    getSetLabels: function(s) {
        if(!s)
            return "Set: null";

        if(!s.size)
            return "Set: {}";

        return "Set: {" + s.values().map(function(n) { return n.label; }).join(", ") + "}";
    },

    printMap: function(cfg, map) {
    for (var node in cfg[2]) {
        var n = cfg[2][node];
        console.log(n.label, map.get(cfg[2][node]));
    }
}

}


function computeInfluence(node) {

    // INFL(node) will be empty unless b has more than one immediate
    // successor (i.e., is a branch statement).
    if (node.prev.length < 2)
        return new Set();

    var result = new Set();
    for(var i = 0; i < node.prev.length; i++) {
        var predecessor = node.prev[i];
        var path = Tools.findSetOfNodesOnPath(predecessor, node);
        result = Set.union(result, path);
    }
    return result;
}


var Set = require('analyses').Set;
var walk = require('estraverse');
var codegen = require('escodegen');

var Syntax = walk.Syntax;

var Tools = {

    getSetLabels: function (s) {
        if (!s)
            return "Set: null";

        if (!s.size)
            return "Set: {}";

        return "Set: {" + s.values().map(function (n) {
            return n.label;
        }).join(", ") + "}";
    },

    printMap: function (map, cfg, cb) {
        cb = cb || JSON.stringify;
        for (var node in cfg[2]) {
            var n = cfg[2][node];
            if (n.label || n.type || !n.astNode)
                console.log(n.label || n.type, cb(map.get(n)));
            else
                console.log(codegen.generate(n.astNode), cb(map.get(n)));
        }
    },

    findVariableAssignments: function (ast, ignoreUninitalizedDeclarations) {
        var definitions = new Set();
        walk.traverse(ast, {
            leave: function (node, parent) {
                switch (node.type) {
                    case Syntax.AssignmentExpression:
                        if (node.left.type == Syntax.Identifier) {
                            definitions.add(node.left.name);
                        }
                        break;
                    case Syntax.VariableDeclarator:
                        if (node.id.type == Syntax.Identifier && (!ignoreUninitalizedDeclarations || node.init)) {
                            definitions.add(node.id.name);
                        }
                        break;
                    case Syntax.UpdateExpression:
                        if (node.argument.type == Syntax.Identifier) {
                            definitions.add(node.argument.name);
                        }
                        break;
                }
            }
        })
        return definitions;
    }

}

module.exports = Tools;



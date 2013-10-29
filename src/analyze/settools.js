
var Set = require('analyses').Set;
var walk = require('estraverse');

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
            console.log(n.label, cb(map.get(n)));
        }
    },

    findVariableDefinitions: function(ast) {
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
}

module.exports = Tools;



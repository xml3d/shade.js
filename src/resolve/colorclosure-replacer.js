/**
 * Simple replacer that collects all closure calls of a color closure expression and passes them to the
 * provided callback
 * @type {exports}
 */

var Traversal = require('estraverse');
var ANNO = require("../type-system/annotation.js").ANNO;
var Shade = require("../interfaces.js");

var Syntax = Traversal.Syntax;

function isColorClosure(node) {
    if (node.type !== Syntax.CallExpression) {
        return false;
    }
    return ANNO(node).isOfKind(Shade.OBJECT_KINDS.COLOR_CLOSURE);
}

function handleCallExpression(node, colorClosureList) {
    var callee = ANNO(node.callee);
    // console.log("Call", node.callee.property, callee.getTypeString(), node.callee.object)
    if (callee.isOfKind(Shade.OBJECT_KINDS.COLOR_CLOSURE)) {
        colorClosureList.push({name: node.callee.property.name, args: node.arguments});
    }
}

function getClosureList(closureExpression) {
    // console.log(JSON.stringify(closureExpression, null, " "))
    var colorClosureList = [];
    Traversal.traverse(closureExpression, {
        leave: function (node) {
            if (node.type == Syntax.CallExpression) {
                return handleCallExpression(node, colorClosureList);
            }
        }
    });
    colorClosureList.sort(function (a, b) {
        return a.name < b.name ? -1 : a.name > b.name ? 1 : 0
    });
    return colorClosureList;
}

function handleColorClosure(closureExpression, replacer) {
    var list = getClosureList(closureExpression);
    return replacer(list);
}

var replace = function (ast, replacer) {
    return Traversal.replace(ast, {
        enter: function (node) {
            if (isColorClosure(node)) {
                this.skip();
                return handleColorClosure(node, replacer)
            }
        }
    });
};


module.exports = replace;

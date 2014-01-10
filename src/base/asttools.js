(function (ns) {

    var Syntax = require("./common.js").Syntax;


    var isVariableName = function (node, parent) {
        return node.type == Syntax.Identifier && !((parent.type == Syntax.MemberExpression && parent.property == node) || parent.type == Syntax.FunctionDeclaration || (parent.type == Syntax.NewExpression && parent.callee == node) ||  (parent.type == Syntax.CallExpression && parent.callee == node));
    };

    var isVariableReference = function (node, parent) {
        return isVariableName(node, parent) && parent.type != Syntax.VariableDeclarator;
    };

    ns.isVariableReference = isVariableReference;
    ns.isVariableName = isVariableName;

}(exports));

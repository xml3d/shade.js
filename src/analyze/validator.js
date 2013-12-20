(function (ns) {

    var common = require("./../base/common.js"),
        Shade = require("../interfaces.js"),
        estraverse = require('estraverse');

    // var codegen = require('escodegen');

    var Syntax = common.Syntax,
        TYPES = Shade.TYPES,
        ANNO = common.ANNO;

    var activeFunction = "";

    var leaveNode = function(node) {
        var annotation = ANNO(node), right;

        if(!annotation.isValid()) {
            var errorInfo = annotation.getError();
            var functionCall = activeFunction ? "In " + activeFunction + ": " : "";
            var error = new Error(functionCall + errorInfo.message);
            error.loc = errorInfo.loc;
            throw error;
        }

        if(node.type == Syntax.VariableDeclarator) {
            if(node.init) {
                right = ANNO(node.init);
                annotation.copy(right);
            }

            if (annotation.getType() == TYPES.ANY || annotation.isNullOrUndefined()) {
                Shade.throwError(node, "No type could be calculated for ")
            }
        }
        if(node.type == Syntax.AssignmentExpression) {
            right = ANNO(node.right);
            annotation.copy(right);

            if (annotation.getType() == TYPES.ANY || annotation.isNullOrUndefined()) {
                Shade.throwError(node, "No type could be calculated for ")
            }
        } else if(node.type == Syntax.ExpressionStatement) {
            var exp = ANNO(node.expression);
            annotation.copy(exp);
        }


    };

    /**
     * Validates AST: Tests if the non-eliminated nodes
     * are all valid and have type information
     * @param {Object} ast
     * @returns Object
     */
    var validate = ns.validate = function (ast) {
        return estraverse.replace(ast, {
            leave: leaveNode,
            enter: function (node) {
                if (node.type == Syntax.FunctionDeclaration) {
                    activeFunction = node.id.name;
                }
            }
        });
    }


}(exports));

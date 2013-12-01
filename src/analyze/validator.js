(function (ns) {

    var common = require("./../base/common.js"),
        Shade = require("../interfaces.js"),
        estraverse = require('estraverse');

    //var codegen = require('escodegen');

    var Syntax = common.Syntax,
        TYPES = Shade.TYPES,
        ANNO = common.ANNO;


    var leaveNode = function(node) {
        var annotation = ANNO(node), right;

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

    //noinspection FunctionWithInconsistentReturnsJS
    /**
     *
     * @param {Object} node
     * @returns Object
     */
    var enterNode = function(node) {

        var test, staticValue;

        var typeInfo = ANNO(node);
        if(typeInfo.hasError()) {
            var error = typeInfo.getError();
            throw error;
        }

        if(node.type == Syntax.IfStatement) {
            test = ANNO(node.test);

            if (test.hasStaticValue() || test.canObject()) {
                this.skip();
                staticValue = test.getStaticTruthValue();
                if (staticValue === true) {
                    return validate(node.consequent);
                }
                if (staticValue === false) {
                    if (node.alternate) {
                        return validate(node.alternate);
                    }
                    return {
                        type: Syntax.EmptyStatement
                    }
                }
            }
        }  else if(node.type == Syntax.ConditionalExpression) {
            test = ANNO(node.test);

            if (test.hasStaticValue() || test.canObject()) {
                this.skip();
                staticValue = test.getStaticTruthValue();
                if (staticValue === true) {
                    return validate(node.consequent)
                } else {
                    return validate(node.alternate);
                }
            }
        } else if (node.type == Syntax.CallExpression) {
            if (node.callee.type == Syntax.MemberExpression) {
                var callingObject = ANNO(node.callee);
                var object = node.callee.object,
                    propertyName = node.callee.property.name;

                // Call a unknown function, we can't compute anything static
                if(!callingObject.isFunction()) {
                    Shade.throwError(node, "TypeError: " + (object.type == Syntax.ThisExpression ? "'this'" : callingObject.getTypeString())+ " has no method '"+ propertyName + "'");
                }
            }
        }
    };


    /**
     * Validates AST: Eliminates static branches and test
     * if the non-eliminated have all necessary type info
     * @param {Object} ast
     * @returns Object
     */
    var validate = ns.validate = function (ast) {
        return estraverse.replace(ast, {
            enter: enterNode,
            leave: leaveNode
        });
    }


}(exports));

(function (ns) {

    var common = require("../../base/common.js"),
        Shade = require("../../interfaces.js"),
        estraverse = require('estraverse');

    // var codegen = require('escodegen');

    var Syntax = common.Syntax,
        TYPES = Shade.TYPES,
        ANNO = common.ANNO;




    //noinspection FunctionWithInconsistentReturnsJS
    /**
     *
     * @param {Object} node
     * @returns {Object|undefined}
     */
    var enterNode = function(node) {

        var test, staticValue;

        var typeInfo = ANNO(node);
        if(!typeInfo.isValid()) {
            return;
        }

        if(node.type == Syntax.IfStatement) {
            test = ANNO(node.test);

            if (test.hasStaticValue() || test.canObject()) {
                this.skip();
                staticValue = test.getStaticTruthValue();
                if (staticValue === true) {
                    return transform(node.consequent);
                }
                if (staticValue === false) {
                    if (node.alternate) {
                        return transform(node.alternate);
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
                    return transform(node.consequent)
                } else {
                    return transform(node.alternate);
                }
            }
        }
    };


    var allowedTypes = [Syntax.Identifier];
    function allowStaticValue(type) {
        return allowedTypes.indexOf(type) !== - 1;
    }


    /**
     * Validates AST: Eliminates static branches and test
     * if the non-eliminated have all necessary type info
     * @param {Object} ast
     * @returns Object
     */
    var transform = ns.transform = function (ast) {
        return estraverse.replace(ast, {
            enter: enterNode
        });
    }


}(exports));

(function (ns) {

    var common = require("../../base/common.js"),
        Shade = require("../../interfaces.js"),
        estraverse = require('estraverse');

    // var codegen = require('escodegen');

    var Syntax = common.Syntax,
        TYPES = Shade.TYPES,
        ANNO = common.ANNO;


    /**
     * Validates AST: Eliminates static branches and test
     * if the non-eliminated have all necessary type info
     * @param {Object} ast
     * @returns Object
     */
    var transform = ns.transform = function (ast, opt) {
        return estraverse.replace(ast, {
            enter: function(node) {
                return enterNode(node, this, opt);
            }
        });
    }

    function isSimpleStatic(typeInfo) {
        return typeInfo.hasStaticValue() && !(typeInfo.isObject() || typeInfo.isNullOrUndefined());
    }

    function generateLiteralFromTypeInfo(typeInfo) {
        return {
            type: Syntax.Literal,
            value: typeInfo.getStaticValue(),
            extra: typeInfo.getExtra()
        }
    }

    function handleIfStatement(node, controller, opt) {
        var test = ANNO(node.test);

        if (test.hasStaticValue() || test.canObject()) {
            controller.skip();
            var staticValue = test.getStaticTruthValue();
            if (staticValue === true) {
                return transform(node.consequent);
            }
            if (staticValue === false) {
                if (node.alternate) {
                    return transform(node.alternate, opt);
                }
                return {
                    type: Syntax.EmptyStatement
                }
            }
        }
    };

    function handleConditionalExpression(node, controller, opt) {
        var test = ANNO(node.test);

        if (test.hasStaticValue() || test.canObject()) {
            controller.skip();
            var staticValue = test.getStaticTruthValue();
            if (staticValue === true) {
                return transform(node.consequent, opt);
            } else {
                return transform(node.alternate, opt);
            }
        }
    }

    function handleAssignmentExpression(node) {
        var right = ANNO(node);

        if(isSimpleStatic(right)) {
            node.right =  generateLiteralFromTypeInfo(right);
            return node;
        }
    }

    function handleCallExpression(node) {
        var args = node.arguments, newArgs = [];
        args.forEach(function (arg) {
            var typeInfo = ANNO(arg);
            if (isSimpleStatic(typeInfo)) {
                newArgs.push(generateLiteralFromTypeInfo(typeInfo))
            } else {
                newArgs.push(arg);
            }
        });
        node.arguments = newArgs;
        return node;
    }

    /**
     *
     * @param {Object} node
     * @returns {*}
     */
    var enterNode = function(node, controller, opt) {

        var typeInfo = ANNO(node);
        if(!typeInfo.isValid()) {
            return;
        }

        switch(node.type) {
            case Syntax.IfStatement:
                return handleIfStatement(node, controller, opt);
            case Syntax.ConditionalExpression:
                return handleConditionalExpression(node, controller, opt);
            case Syntax.AssignmentExpression:
                return handleAssignmentExpression(node);
            case Syntax.NewExpression:
                return handleCallExpression(node);
        }
    };



}(exports));

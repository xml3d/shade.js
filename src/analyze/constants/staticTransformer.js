(function (ns) {

    var common = require("../../base/common.js"),
        Shade = require("../../interfaces.js"),
        estraverse = require('estraverse');

    // var codegen = require('escodegen');

    var Syntax = common.Syntax,
        TYPES = Shade.TYPES,
        ANNO = common.ANNO;


    /**
     * Transform AST: Eliminate branches due to static conditions
     * and replace static expressions with simpler expressions
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

    function handleLogicalExpression(node, controller, opt) {
        var left = ANNO(node.left);
        var right = ANNO(node.right);
        var leftBool = left.getStaticTruthValue();
        var rightBool = right.getStaticTruthValue();

        if (node.operator === "||") {
            if (leftBool === false) {
                return node.right;
            }
            if (leftBool === true) {
                return node.left;
            }
            // Left is dynamic, let's check right
            if (rightBool === false) {
                return node.left;
            }
        } else if (node.operator === "&&") {
            if (leftBool === false) {
                return node.left;
            }
            if (leftBool === true) {
                return node.right;
            }
            // Left is dynamic, let's check right
            if (rightBool === true) {
                // Now the result type is always the one of the left value
                return node.left;
            }
            if (rightBool === false) {
                // Now the result must be false
                return {
                    type: Syntax.Literal,
                    value: "false",
                    extra: { type: "boolean"}
                };
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
            case Syntax.LogicalExpression:
                return handleLogicalExpression(node, controller, opt);
            case Syntax.AssignmentExpression:
                return handleAssignmentExpression(node);
            case Syntax.NewExpression:
            //case Syntax.CallExpression:
                return handleCallExpression(node);
        }
    };



}(exports));

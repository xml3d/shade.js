(function(ns){

    var Syntax = require('estraverse').Syntax,
        ANNO = require("../../type-system/annotation.js").ANNO,
        Shade = require("../../interfaces.js");


    var UnaryFunctions = {
        "!": function(a) { return !a; },
        "-": function(a) { return -a; },
        "+": function(a) { return +a; },
        "typeof": function(a) { return typeof a; },
        "void": function(a) { return void a; },
        "delete": function(a) { return true; }

    };

    var BinaryFunctions = {
        "+" : function(a,b) { return a + b; },
        "-" : function(a,b) { return a - b; },
        "/" : function(a,b) { return a / b; },
        "*" : function(a,b) { return a * b; },
        "%" : function(a,b) { return a % b; },

        "==" : function(a,b) { return a == b; },
        "!=" : function(a,b) { return a != b; },
        "===" : function(a,b) { return a === b; },
        "!==" : function(a,b) { return a !== b; },
        "<" : function(a,b) { return a < b; },
        "<=" : function(a,b) { return a <= b; },
        ">" : function(a,b) { return a > b; },
        ">=" : function(a,b) { return a >= b; }
    };


    /**
     *
     * @param node
     */
    function getConstantValue(node) {
        if (node.type === Syntax.Literal) {
            var value = node.raw !== undefined ? node.raw : node.value;
            var number = parseFloat(value);
            if (!isNaN(number))
                return number;
            value = node.value;
            switch(value) {
                case "true": return true;
                case "false": return false;
                case "null": return null;
                default: return value;
            }
        }
        if (node.type == Syntax.MemberExpression || node.type == Syntax.CallExpression  || node.type == Syntax.Identifier || node.type == Syntax.NewExpression || node.type == Syntax.LogicalExpression) {
            return ANNO(node).getConstantValue();
        }
        if (node.type === Syntax.UnaryExpression) {
            if (node.operator == "typeof") {
                return ANNO(node).getTypeString();
            }
            if(UnaryFunctions.hasOwnProperty(node.operator)) {
                return UnaryFunctions[node.operator](getConstantValue(node.argument));
            }
            Shade.throwError(node, "Unknown unary operator: " + node.operator);
        }
        if (node.type === Syntax.BinaryExpression) {
            if(BinaryFunctions.hasOwnProperty(node.operator)) {
                return BinaryFunctions[node.operator](getConstantValue(node.left), getConstantValue(node.right));
            }
            Shade.throwError(node, "Unknown binary operator: " + node.operator);
        }
        Shade.throwError(node, "Evaluating static value for node type: " + node.type);
    };


    function getConstantTruthValue(node) {
        var aNode = ANNO(node);

        // !!undefined == false;
        if (aNode.isNullOrUndefined())
            return false;
        // !!{} == true
        if (aNode.isObject() || this.isFunction())
            return true;
        // In all other cases, it depends on the value,
        // thus we can only evaluate this for static objects
        if (aNode.hasConstantValue()) {
            return !!aNode.getConstantValue();
        }
        return undefined;
    }

    exports.getConstantValue = getConstantValue;
    exports.getConstantTruthValue = getConstantTruthValue;



}(exports));

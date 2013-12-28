(function (ns) {

    var walk = require('estraverse');
    var Syntax = walk.Syntax;
    var ANNO = require("../../base/annotation.js").ANNO;



    function isMathCall(node) {
        return (node.callee.type === Syntax.MemberExpression && node.callee.object.type === Syntax.Identifier && node.callee.object.name === "Math");
    }

    function isVecMathCall(node) {
        if(!isMathCall(node))
            return false;
        var firstArgument = ANNO(node.arguments[0]);
        return firstArgument.isVector();
    }

    var leaveVisitor = function (node, parent, variables, controller) {
        if (node.type == Syntax.MemberExpression) {
            var object = ANNO(node.object);
            if (object.isGlobal() && node.property.type == Syntax.Identifier && ((parent == node) || parent.type != Syntax.MemberExpression)) {
                var property = ANNO(node.property);
                // Is the accessed parameter is a scalar value, we have to
                // access the first entry of the input array
                if (!property.isObject()) {
                    return {
                        type: Syntax.MemberExpression,
                        computed: true,
                        object: node,
                        property: {
                            type: Syntax.Literal,
                            value: 0
                        }
                    }
                }
            }
        }

        if (node.type == Syntax.CallExpression) {
            if (isVecMathCall(node)) {
                node.callee.object.name = "this.VecMath";
            }
        }


        if (node.type == Syntax.Identifier) {
            if (~[Syntax.MemberExpression, Syntax.FunctionDeclaration, Syntax.VariableDeclarator].indexOf(parent.type))
                return;

            if (parent.type == Syntax.NewExpression && parent.callee == node)
                return;

            // Not a variable on the right side
            if (parent.type == Syntax.AssignmentExpression && parent.left == node)
                return;

            if(variables.hasOwnProperty(node.name)) {
                //console.log("Found: " + node.name, this[node.name]);
                var code = variables[node.name].code;
                return code;
            }
        }

        if (node.type == Syntax.NewExpression) {
            if (node.callee.type == Syntax.Identifier) {
                var name = node.callee.name;
                switch(name) {
                    case "Vec2":
                    case "Vec3":
                    case "Vec4":
                        node.callee.name = "Shade." + name;
                        break;

                }
            }
        }

        };

    ns.transformUniformSetter = function (ast, variables) {
        return walk.replace(ast, { leave: function(node, parent) {
            return leaveVisitor(node, parent, variables, this);
        }});
    };


}(exports));

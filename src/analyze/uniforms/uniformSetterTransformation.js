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

    var leaveVisitor = function (node, parent) {
        if (node.type == Syntax.MemberExpression) {
            var object = ANNO(node.object);
            if (object.isGlobal() && node.property.type == Syntax.Identifier) {
                var property = ANNO(node.property);
                // Is the accessed parameter is a scalar value, we have to
                // access the first entry of the input array
                if (!property.isObject()) {
                    return {
                        type: Syntax.MemberExpression,
                        computed: true,
                        object: node.property,
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
                node.callee.object.name = "VecMath";
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

            if(this.hasOwnProperty(node.name)) {
                //console.log("Found: " + node.name, this[node.name]);
                return this[node.name].code;

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
        return walk.replace(ast, { leave: leaveVisitor.bind(variables) });
    };


}(exports));

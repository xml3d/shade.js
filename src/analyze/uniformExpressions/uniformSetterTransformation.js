(function (ns) {

    var walk = require('estraverse');
    var Syntax = walk.Syntax;
    var ANNO = require("../../base/annotation.js").ANNO;

    var interfaces = require("../../interfaces.js");
    var TYPES = interfaces.TYPES,
        KINDS = interfaces.OBJECT_KINDS;

    function getConstructor(kind){
        switch(kind){
            case KINDS.FLOAT2: return "Shade.Vec2"; break;
            case KINDS.FLOAT3: return "Shade.Vec3"; break;
            case KINDS.FLOAT4: return "Shade.Vec4"; break;
            case KINDS.MATRIX3: return "Shade.Mat3"; break;
            case KINDS.MATRIX4: return "Shade.Mat4"; break;
            default: throw "Unsupported object kind in uniform expression argument: " + kind;
        }
    }


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
            if (node.object.type == Syntax.Identifier && object.isUniformExpression()) {
                if(variables.hasOwnProperty(node.object.name)) {
                //console.log("Found: " + node.object.name, variables[node.object.name]);
                    node.object = variables[node.object.name].code;
                }
            }
            if (object.isGlobal() && node.property.type == Syntax.Identifier) {
                var property = ANNO(node.property);

                if(property.isObject()){
                    // Is the accessed parameter is a vector or matrix , we have to
                    // wrap the typed array in the respective constructor
                    var constructor = getConstructor(property.getKind());
                    return {
                        type: Syntax.NewExpression,
                        callee: { type: Syntax.Identifier, name: constructor},
                        arguments:  [node]
                    }
                }
                else if((parent == node) || parent.type != Syntax.MemberExpression){
                    // Is the accessed parameter is a scalar value, we have to
                    // access the first entry of the input array
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

        if (node.type == Syntax.ReturnStatement) {
            var anno = ANNO(node.argument);
            if(anno.isObject()){
                node.argument = { type: Syntax.CallExpression,
                    callee: {
                        type: Syntax.MemberExpression,
                        object: node.argument,
                        property: {type: Syntax.Identifier,
                            name: "_toFloatArray"
                        }
                    },
                    arguments: []
                };
                return node;
            }
        }
        }

    ns.transformUniformSetter = function (ast, variables) {
        return walk.replace(ast, { leave: function(node, parent) {
            return leaveVisitor(node, parent, variables, this);
        }});
    };


}(exports));

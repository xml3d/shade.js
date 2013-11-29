(function (ns) {

    var Closures = require("./xml3d-forward.js"),
        Traversal = require('estraverse'),
        Syntax = Traversal.Syntax,
        parser = require('esprima'),
        Shade = require("../../interfaces.js"),
        ANNO = require("./../../base/annotation.js").ANNO;



    function containsClosure(arr, name) {
        arr.some(function (func) {
            return func.name = name;
        });
    }

    var handleClosure = function (node, state) {
        var closureName = node.callee.property.name,
            result = {
                type: Syntax.CallExpression,
                arguments: node.arguments,
                callee: {
                    type: Syntax.Identifier,
                    name: closureName
                },
                extra: {
                    type: Shade.TYPES.OBJECT,
                    kind: Shade.OBJECT_KINDS.COLOR_CLOSURE
                }
            };

        console.log("Leaving:" + closureName);

        // Already contains the function. Normally we have to also check for the signature
        if (containsClosure(state.newFunctions, closureName)) {
            return result;
        }

        if (!Closures.hasOwnProperty(closureName)) {
            console.error("No implementation for closure '", closureName, "'");
            return;
        };

        var closureImplementation = Closures[closureName];
        try {
            var closureAST = parser.parse(closureImplementation.toString(), { raw: true });
            state.newFunctions.push(closureAST.body[0]);
        } catch (e) {
            console.error("Error in analysis of closure '", closureName, "'", e);
            return;
        }
        if (node.callee.object.type == Syntax.NewExpression) {
            return result;
        } else {
            return {
                type: Syntax.CallExpression,
                callee: {
                    type: "MemberExpression",
                    computed: false,
                    object: node.callee.object,
                    property: {
                        "type": "Identifier",
                        "name": "add"
                    }

                },
                extra: {
                    type: Shade.TYPES.OBJECT,
                    kind: Shade.OBJECT_KINDS.COLOR_CLOSURE
                },
                arguments: [ result ]};
        }
    }

    var handleCallExpression = function (node, state) {
        var callee = ANNO(node.callee);
        // console.log("Call", node.callee.property, callee.getTypeString(), node.callee.object)
        if(callee.isOfKind(Shade.OBJECT_KINDS.COLOR_CLOSURE)) {
            return handleClosure(node, state);
        }
    }

    function handleNewExpression(node, state, parent) {
        if (node.callee.name == "Shade") {
            var result = ANNO(node);
            result.setType(Shade.TYPES.OBJECT, Shade.OBJECT_KINDS.COLOR_CLOSURE);
            //console.log(parent);
        }
    }

    function handleMemberExpression(node, state, parent) {
        var object = ANNO(node.object);
        var result = ANNO(node);
        if (object.isOfKind(Shade.OBJECT_KINDS.COLOR_CLOSURE)) {
            var closureName = node.property.name;
            if (!Closures.hasOwnProperty(closureName)) {
                console.error("No implementation for closure '", closureName, "'");
                return;
            };
            result.copy(object);
        }
    }

    var switcher = function (state, node, parent) {
        switch (node.type) {
            case Syntax.CallExpression:
                return handleCallExpression(node, state);
            case Syntax.NewExpression:
                return handleNewExpression(node, state, parent);
            case Syntax.MemberExpression:
                return handleMemberExpression(node, state, parent);
        }
    }

    ns.resolve = function (aast, opt) {
        var state = {
            program: aast,
            newFunctions: []
        }

        aast = Traversal.replace(aast, {
            leave: switcher.bind(this, state)
        })

        state.newFunctions.forEach(function(newFunction) {
            state.program.body.unshift(newFunction);
        })

        return aast;
    }

}(exports));

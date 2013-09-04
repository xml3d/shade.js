(function (ns) {

    var Closures = require("./xml3d-forward.js"),
        Traversal = require('estraverse'),
        Syntax = Traversal.Syntax,
        parser = require('esprima'),
        Shade = require("../../interfaces.js");


    function containsClosure(arr, name) {
        arr.some(function (func) {
            return func.name = name;
        });
    }

    var handleClosure = function (node, state) {
        var closureName = node.callee.property.name,
            result = {
                type: Syntax.CallExpression,
                arguments: [{
                    type: Syntax.Identifier,
                    name: "env"
                }].concat(node.arguments),
                callee: {
                    type: Syntax.Identifier,
                    name: closureName
                }
            };

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
            //closureAST.body[0].params = closureAST.body[0].params.slice(1);
            state.newFunctions.push(closureAST.body[0]);
        } catch (e) {
            console.error("Error in analysis of closure '", closureName, "'", e);
            return;
        }
        return result;
    }

    var handleCall = function (node, state) {
        if (node.callee.type == Syntax.MemberExpression) {
            var object = node.callee.object;
            if (object.type == Syntax.Identifier && object.name == "Shade") {
                return handleClosure(node, state);
            }
        }
    }

    var switcher = function (state, node) {
        switch (node.type) {
            case Syntax.CallExpression:
                return handleCall(node, state);
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

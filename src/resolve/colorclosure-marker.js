(function (ns) {

    var Traversal = require('estraverse'),
        Syntax = Traversal.Syntax,
        parser = require('esprima'),
        Shade = require("../interfaces.js"),
        ANNO = require("./../base/annotation.js").ANNO;

    function handleCallExpression(node) {
        var callee = ANNO(node.callee);
        // console.log("Call", node.callee.property, callee.getTypeString(), node.callee.object)
        if(callee.isOfKind(Shade.OBJECT_KINDS.COLOR_CLOSURE)) {
            ANNO(node).copy(callee);
        }
    }

    function handleNewExpression(node) {
        if (node.callee.name == "Shade") {
            var result = ANNO(node);
            result.setType(Shade.TYPES.OBJECT, Shade.OBJECT_KINDS.COLOR_CLOSURE);
        }
    }

    function handleMemberExpression(node) {
        var object = ANNO(node.object);
        var result = ANNO(node);
        if (object.isOfKind(Shade.OBJECT_KINDS.COLOR_CLOSURE)) {
            var closureName = node.property.name;
            if (!Shade.ColorClosures.hasOwnProperty(closureName)) {
                console.error("No closure for name'", closureName, "'");
                return;
            };
            result.copy(object);
        }
    }

    ns.markColorClosures = function(programAast){
        Traversal.traverse(programAast, {
            leave: function(node, parent){
                 switch (node.type) {
                    case Syntax.CallExpression:
                        return handleCallExpression(node);
                    case Syntax.NewExpression:
                        return handleNewExpression(node);
                    case Syntax.MemberExpression:
                        return handleMemberExpression(node);
                }
            }
        });
    }

}(exports));

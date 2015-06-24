(function (ns) {

    var Traversal = require('estraverse'),
        Syntax = Traversal.Syntax,
        parser = require('esprima'),
        Shade = require("../interfaces.js"),
        ANNO = require("./../type-system/annotation.js").ANNO;

    function handleCallExpression(node) {
        var callee = ANNO(node.callee);
        // console.log("Call", node.callee.property, callee.getTypeString(), node.callee.object)
        if(callee.isOfKind(Shade.OBJECT_KINDS.COLOR_CLOSURE)) {
            ANNO(node).copy(callee);
        }
    }

    function handleMemberExpression(node) {
        var object = ANNO(node.object);
        var result = ANNO(node);
        if (node.object.name == "Shade" || object.isOfKind(Shade.OBJECT_KINDS.COLOR_CLOSURE)) {
            var closureName = node.property.name;
            if (!Shade.ColorClosures.hasOwnProperty(closureName)) {
                return;
            };
            result.setType(Shade.TYPES.OBJECT, Shade.OBJECT_KINDS.COLOR_CLOSURE);
        }
    }

    ns.markColorClosures = function(programAast){
        Traversal.traverse(programAast, {
            leave: function(node, parent){
                 switch (node.type) {
                    case Syntax.CallExpression:
                        return handleCallExpression(node);
                    case Syntax.MemberExpression:
                        return handleMemberExpression(node);
                }
            }
        });
    }

}(exports));

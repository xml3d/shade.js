(function(ns){

    var Shade = require("../../../interfaces.js").Shade,
        TYPES = Shade.TYPES,
        KINDS = Shade.OBJECT_KINDS,
        Node = require("../../../base/node.js").Node;

    var ShadeObject = {
        diffuse: {
            type: TYPES.OBJECT,
            kind: KINDS.COLOR_CLOSURE,
            evaluate: function(result, args, ctx) {
                if (args.length < 1)
                    throw new Error("Shade.diffuse expects at least 1 parameter.")
                var normal = Node.createForContext(args[0], ctx);
                if(!normal.canNormal()) {
                    throw new Error("First argument of Shade.diffuse must evaluate to a normal");
                }
                if (args.length > 1) {
                    var color = Node.createForContext(args[1], ctx);
                    //console.log("Color: ", color.str(), color.getType(ctx));
                    if(!color.canColor()) {
                        throw new Error("Second argument of Shade.diffuse must evaluate to a color. Found: " + color.str());
                    }
                }
            }
        }
    };

    ns.ShadeEntry = ShadeObject;

}(exports));

(function (ns) {

    var Base = require("../../base/index.js").Base,
        Shade = require("../../interfaces.js").Shade;

    var ObjectRegistry = {};

    require("./registry/math.js").register(ObjectRegistry);

    var walk = require('estraverse');
    var Syntax = walk.Syntax;





    /**
     * Transforms the JS AST to an AST representation convenient
     * for code generation
     * @constructor
     */
    var GLASTTransformer = function () {

    };

    Base.extend(GLASTTransformer.prototype, {
        transformAAST: function (aast) {

            walk.replace(aast, {

                enter: function(node, parent, cb) {
                    //console.log("Enter:", node.type);
                    switch(node.type) {
                        case Syntax.MemberExpression:
                            return handleMemberExpression(node, parent, cb);
                        case Syntax.BinaryExpression:
                            return handleBinaryExpression(node, parent, cb);

                    }
                }


            });
            return aast;
        }
    });




    var handleMemberExpression = function(memberExpression, parent, cb) {
       // console.log("Member:", memberExpression.object);
       var object = memberExpression.object,
           property = memberExpression.property;


       if (object.name in ObjectRegistry) {
            var objectEntry = ObjectRegistry[object.name];
           if (property.name in objectEntry) {
               var propertyHandler = objectEntry[property.name];
               if (typeof propertyHandler == "function") {
                   return propertyHandler(memberExpression, parent, cb);
               }
           }
       }
    };

    var handleBinaryExpression = function(binaryExpression, parent, cb) {
        if (binaryExpression.operator = "%") {
            return handleModulo(binaryExpression);
        }
    }

    var handleModulo = function(binaryExpression) {
        return {
            type: Syntax.CallExpression,
            callee: {
                type: Syntax.Identifier,
                name: "mod"
            },
            arguments: [
                binaryExpression.left,
                binaryExpression.right // TODO: Needs to be number type
            ]
        }
    }



    // Exports
    ns.GLASTTransformer = GLASTTransformer;


}(exports));

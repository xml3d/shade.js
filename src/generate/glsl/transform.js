(function (ns) {

    var Base = require("../../base/index.js").Base;

    /**
     * Transforms the JS AST to an AST representation convenient
     * for code generation
     * @constructor
     */
    var GLASTTransformer = function () {

    };

    Base.extend(GLASTTransformer.prototype, {
        transformAAST: function (aast) {
            return aast;
        }
    })

    ns.GLASTTransformer = GLASTTransformer;


}(exports));
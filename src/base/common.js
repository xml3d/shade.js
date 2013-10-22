(function (ns) {

    var ANNO = require("../base/annotation.js").ANNO,
        estraverse = require('estraverse');


    var Syntax = estraverse.Syntax;

    /**
     *
     * @param {object|Array.<object>} node
     * @param scope
     * @returns {TypeInfo|Array.<TypeInfo>}
     */
    ns.createTypeInfo = function (node, scope) {
        if(Array.isArray(node)) {
            return node.map(function (arg) {
                return scope.createTypeInfo(arg);
            });
        }
        var result = ANNO(node);
        if (node.type == Syntax.Identifier) {
            var name = node.name;
            var binding = scope.getBindingByName(name);
            if (binding) {
                result.copy(binding);
                return binding;
            }
        }
        return result;
    };


    ns.Syntax = Syntax;
    ns.VisitorOption = estraverse.VisitorOption;
    ns.ANNO = ANNO;


}(exports));

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
        if (node.type == Syntax.Identifier || node.type == Syntax.ThisExpression) {
            var name = node.type == Syntax.Identifier ? node.name : 'this';
            var binding = scope.getBindingByName(name);
            if (binding) {
                result.copy(binding);
                return binding;
            }
        }
        return result;
    };

    /**
     *
     * @param {object|Array.<object>} node
     * @param scope
     * @returns {TypeInfo|Array.<TypeInfo>}
     */
    ns.getTypeInfo = function (node, scope) {
        if(!node)
            return null;

        if(Array.isArray(node)) {
            return node.map(function (arg) {
                return scope.getTypeInfo(arg);
            });
        }
        if (node.type == Syntax.Identifier || node.type == Syntax.ThisExpression) {
            var name = node.type == Syntax.Identifier ? node.name : 'this';
            var binding = scope.getBindingByName(name);
            if (binding) {
                ANNO(node, binding.getExtra());
                return binding;
            }
        }
        return ANNO(node);
    };

    ns.Syntax = Syntax;
    ns.VisitorOption = estraverse.VisitorOption;
    ns.Map = require('es6-map-shim').Map;

    ns.ANNO = ANNO;
    ns.getObjectReferenceFromNode = ns.getTypeInfo;


}(exports));

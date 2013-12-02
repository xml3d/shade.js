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
     * @param {Array?} constants Additional array of constants
     * @param {boolean} check
     * @returns {TypeInfo|Array.<TypeInfo>}
     */
    ns.getTypeInfo = function getTypeInfo(node, scope, constants, check) {
        if(!node)
            return null;

        check = check == undefined ? false : check;

        if(Array.isArray(node)) {
            return node.map(function (arg) {
                return getTypeInfo(arg, scope, constants, check);
            });
        }
        var binding;
        if (node.type == Syntax.Identifier) {
            var name = node.name;

            if(name == 'undefined')
                return ANNO(node);

            binding = scope.getBindingByName(name);
            if(binding == undefined && check) {
                throw new Error("ReferenceError: " + name + " is not defined");
            }
            if(binding) {
                var result = ANNO(node, binding.getExtra());
                if (constants) {
                    var propagatedConstant = constants.filter(function (constant) {
                        return constant.name == name;
                    });
                    if (propagatedConstant.length) {
                        result.setStaticValue(propagatedConstant[0].constant);
                    }
                }
                return binding;

            }
        } else if (node.type == Syntax.ThisExpression) {
            binding = scope.getBindingByName('this');
        }
        return binding || ANNO(node);
    };

    ns.Syntax = Syntax;
    ns.VisitorOption = estraverse.VisitorOption;
    ns.Map = require('es6-map-shim').Map;

    ns.ANNO = ANNO;
    ns.getObjectReferenceFromNode = ns.getTypeInfo;


}(exports));

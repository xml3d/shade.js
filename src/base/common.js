(function (ns) {

    var ANNO = require("../type-system/annotation.js").ANNO,
        estraverse = require('estraverse'),
        ErrorHandler = require("../type-system/errors.js");


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
                result.copyFrom(binding);
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

            binding = scope.get(name);
            if(binding == undefined && check) {
                ANNO(node).setInvalid(ErrorHandler.generateErrorInformation(node, ErrorHandler.ERROR_TYPES.REFERENCE_ERROR, name, "is not defined"));
                return ANNO(node);
            }
            if(binding) {
                var result = ANNO(node);
                result.copyFrom(binding);
                // A variable is dynamic per default. Only if it's listed in constant
                // we can assume a static value
                result.setDynamicValue();
                binding.setDynamicValue();
                if (constants && !binding.isNullOrUndefined()) {
                    var propagatedConstant = constants.filter(function (constant) {
                        return constant.name == name;
                    });

                    if (propagatedConstant.length) {
                        binding.setConstantValue(propagatedConstant[0].constant);
                        result.setConstantValue(propagatedConstant[0].constant);
                    }
                }
                return binding;

            }
        } else if (node.type == Syntax.ThisExpression) {
            binding = scope.get("this");
        }
        return binding || ANNO(node);
    };



    ns.Syntax = Syntax;
    ns.VisitorOption = estraverse.VisitorOption;

    ns.ANNO = ANNO;
    ns.getObjectReferenceFromNode = ns.getTypeInfo;


}(exports));

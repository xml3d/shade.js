// External dependencies
var util = require("util");
var assert = require("assert");
var extend = require("lodash.assign");
var Syntax = require('estraverse').Syntax;
var Map = require('es6-map');

// Internal dependencies
var Shade = require("../interfaces.js"); // TODO(ksons): Eliminate this dependency
var ErrorHandler = require("./errors.js");
var Annotation = require("./annotation.js").Annotation;
var TypeInfo = require("./typeinfo.js").TypeInfo;
var TYPES = require("./constants.js").TYPES;
var ANNO = require("../base/common.js").ANNO;

/**
 * @param {Object} node AST node that defines the scope
 * @param {Scope|null} parent
 * @param opt
 * @constructor
 */
var Scope = function (node, parent, opt) {
    opt = opt || {};

    if (parent) {
        assert.ok(parent instanceof Scope);
    }

    /** @type (Scope|null) */
    this.parent = parent || null;

    this.scope = node.scope = node.scope || {};

    /** @type {Map} */
    this.scope.bindings = {};

    this.scope.name = opt.name || node.name || "|anonymous|";
};

extend(Scope.prototype, {
    declares: function (identifier) {
        return this.getBindings().hasOwnProperty(identifier);
    },

    getName: function () {
        return this.scope.name;
    },

    getRootContext: function () {
        if (this.parent)
            return this.parent.getRootContext();
        return this;
    },

    getBindings: function () {
        return this.scope.bindings;
    },

    updateReturnInfo: function (annotation) {
        this.scope.returnInfo = annotation.info;
    },
    getReturnInfo: function () {
        return this.scope.returnInfo || {type: TYPES.UNDEFINED};
    },

    /**
     * @param {string} name
     * @returns {*}
     */
    get: function (name) {
        if(this.declares(name)) {
			var binding = this.getBindings()[name];
            return new TypeInfo(binding.extra);
        }
        if (this.parent)
            return this.parent.get(name);
        return undefined;
    },

	type: function (node) {
        if (isVariable(node)) {
            assert(node.name);
            var definition = this.get(node.name);
			if(!definition) {
                ErrorHandler.throwError(node, ErrorHandler.ERROR_TYPES.REFERENCE_ERROR + ": " + node.name + " is not defined")
            }
			assert(definition instanceof TypeInfo);
            return definition;
        }
        //console.log("type no varable", node)
        return ANNO(node);
    },

    /**
     * @param {string} name
     * @returns {Scope|null}
     */
    getContextForName: function (name) {
        if (this.declares(name))
            return this;
        if (this.parent)
            return this.parent.getContextForName(name);
        return null;
    },

    getVariableIdentifier: function (name) {
        var scope = this.getContextForName(name);
        if (!scope)
            return null;
        return scope.str() + "." + name;
    },

    declare: function (name, fail, position) {
        var bindings = this.getBindings();
        fail = (fail == undefined) ? true : fail;
        if (bindings.hasOwnProperty(name)) {
            if (fail) {
                throw new Error(name + " was already declared in this scope.")
            } else {
                return false;
            }
        }

        bindings[name] =  {
            initialized: false,
            initPosition: position,
            extra: {
                type: TYPES.UNDEFINED
            }
        };
        return true;
    },

	declarePredefined:function(name, descriptor) {
        assert(descriptor && descriptor.name);
		this.declare(name, false);
		this.updateTypeInfo(name, new TypeInfo({type: typeof descriptor, kind: descriptor.name }) );
    },

    /**
     *
     * @param {string} name
     * @param {TypeInfo} newTypeInfo
     * @param {Object} node AST node the new type info originates from
     */
    updateTypeInfo: function (name, newTypeInfo, node) {
        if (!this.declares(name)) {
            if (node) {
                newTypeInfo.setInvalid(ErrorHandler.generateErrorInformation(node, ErrorHandler.ERROR_TYPES.REFERENCE_ERROR, name, "is not defined"));
                return;
            }
            throw new Error("Reference error: " + name + " is not defined.")
        }
        var v = this.getBindings()[name];
        var type = new TypeInfo(v.extra);

        if (v.initialized && type.getType() !== newTypeInfo.getType()) {
            if (node) {
                newTypeInfo.setInvalid(ErrorHandler.generateErrorInformation(node, ErrorHandler.ERROR_TYPES.SHADEJS_ERROR, name, "may not change it's type"));
                return;
            }
            throw new Error("Variable may not change it's type: " + name);
        }
        if (!v.initialized) {
            // Annotate the declaration, if one is given
            /*if (v.node.initPosition)
                v.node.initPosition.copy(typeInfo);*/ // FIXME(ksons)
        }

        type.copyFrom(newTypeInfo);
        type.setDynamicValue();
        v.initialized = !type.isUndefined();
    },

    /*registerObject: function (name, obj) {
        this.registry[obj.id] = obj;
        var bindings = this.getBindings();
        bindings[name] = {
            extra: {
                type: TYPES.OBJECT
            },
            ref: obj.id
        };
    },*/

    declareParameters: function (params) {
        var bindings = this.getBindings();
        for (var i = 0; i < params.length; i++) {
            var parameter = params[i];
            var annotation = new Annotation(parameter);

            var binding = new TypeInfo({});
            binding.copy(annotation);
            bindings[parameter.name] = { extra: binding };
        }
    },

    str: function () {
        var ctx = this;
        var names = [];
        while (ctx) {
            names.unshift(ctx.getName());
            ctx = ctx.parent;
        }
        return names.join(".");
    },

    getAllBindings: function () {
        var result = Object.keys(this.getBindings());
        if (this.parent) {
            var parentBindings = this.parent.getAllBindings();
            for (var i = 0; i < parentBindings.length; i++) {
                if (result.indexOf(parentBindings[i]) !== -1) {
                    result.push(parentBindings[i]);
                }
            }
        }
        return result;
    },

    /**
     *
     * @param node
     * @returns {TypeInfo}
     */
    createTypeInfo: function (node) {
        var result = new Annotation(node);
        if (node.type == Syntax.Identifier) {
            var name = node.name;
            var binding = this.getBindingByName(name);
            if (binding) {
                result.copy(binding);
                return binding;
            }
        }
        return result;
    },

    getObjectInfoFor: function (obj) {
        if (!obj.isObject())
            return null;

        // There are three ways to get the properties of an object

        // 1. Object is static and has registered it's properties via reference
        var staticProperties = obj.getStaticProperties();
        if (staticProperties)
            return staticProperties;

        // 1: Object is generic (any), then it carries it's information itself
        if (obj.isOfKind(Shade.OBJECT_KINDS.ANY)) {
            return obj.getNodeInfo();
        }


        // 3. Last chance: The object is an instance of a registered type,
        // then we get the information from it's kind
        return this.registry && this.registry.getInstanceForKind(obj.getKind()) || null;
    }

});

function isVariable(node) {
    return node.type == Syntax.Identifier && node.name != "undefined";
}


/**
 * TODO(ksons): Eliminate this class
 * @param binding
 * @param registry
 * @extends TypeInfo
 * @constructor
 */
/*var Binding = function (obj) {
    this.typeinfo = TypeInfo.call(this, binding.extra);
    if (this.node.ref) {
        if (!registry[this.node.ref])
            throw Error("No object has been registered for: " + this.node.ref);
        this.globalObject = registry[this.node.ref].object;
        if (this.globalObject) {
            this.setType(TYPES.OBJECT);
        }
    }
};

extend(Binding.prototype, {
    hasConstructor: function () {
        return !!this.getConstructor();
    },
    getConstructor: function () {
        return this.globalObject && this.globalObject.constructor;
    },
    isInitialized: function () {
        return this.node.initialized;
    },
    setInitialized: function (v) {
        this.node.initialized = v;
    },
    hasStaticValue: function () {
        return this.globalObject ? true : TypeInfo.prototype.hasStaticValue.call(this);
    },
    getStaticValue: function () {
        if (!this.hasStaticValue()) {
            throw new Error("Node has no static value: " + this.node);
        }
        return this.globalObject ? this.globalObject.staticValue : TypeInfo.prototype.getStaticValue.call(this);
    },
    isGlobal: function () {
        return this.node.info && this.node.info._global || TypeInfo.prototype.isGlobal.call(this);
    },
    getType: function () {
        return this.globalObject ? TYPES.OBJECT : TypeInfo.prototype.getType.call(this);
    },
    getStaticProperties: function () {
        if (this.globalObject)
            return this.globalObject.static;
        return null;
    },
    getInfoForSignature: function (signature) {
        var extra = this.getExtra();
        if (!extra.signatures)
            return null;
        return extra.signatures[signature];
    },
    setInfoForSignature: function (signature, info) {
        var extra = this.getExtra();
        if (!extra.signatures)
            extra.signatures = {};
        return extra.signatures[signature] = info;
    }


});     */


module.exports = Scope;





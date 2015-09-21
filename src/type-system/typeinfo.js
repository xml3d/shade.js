// External dependencies
var Syntax = require('estraverse').Syntax;
var Set = require('analyses').Set;
var extend = require("lodash.assign");
var clone = require("lodash.clone");
var assert = require('assert');
var TypeSystem = require('./type-system.js');

// Internal dependencies
var Shade = require("../interfaces.js"); // TODO(ksons): Eliminate this dependency
var TYPES = require("./constants.js").TYPES;

// TODO(ksons): New mechanism for predefined types
var KINDS = Shade.OBJECT_KINDS;

/**
 * @param {*} node Carrier object for the type info, only node.extra gets polluted
 * @param {Object?} extra
 * @constructor
 */
var TypeInfo = function (info) {
    this.info = info;
    var self = this;

    assert(info.type);

    Object.defineProperties(this, {
        type: {get: function() { return info.type }, set: function(e) { info.type = e; }},
        error: {get: function() { return info.error }, set: function(e) { info.error = e; }},
        constructor: {get: function() {
            if(!self.isFunction() || !self.getKind()) {
                throw new Error("Has no constructor:" + self);
            }
			var predefinedType = TypeSystem.getPredefinedObject(this.getKind());
			return predefinedType;
            }
        }
    });
};

TypeInfo.createForContext = function (node, ctx) {
    var result = new TypeInfo(node.extra);
    if (result.getType() !== TYPES.ANY) {
        return result;
    }

    if (node.type == Syntax.Identifier) {
        var name = node.name;
        var variable = ctx.getBindingByName(name);
        if (variable) {
            result.copy(variable);
        }
    }
    return result;
};

/**
 * @param {TypeInfo} typeInfo
 * @param {Object?} value
 */
TypeInfo.copyStaticValue = function (typeInfo, value) {
    value = value || typeInfo.getConstantValue();
    // We don't have to copy primitive types
    if (!typeInfo.isObject())
        return value;
    switch (typeInfo.getKind()) {
        case "Vec2":
            return new Shade.Vec2(value);
        case "Vec3":
            return new Shade.Vec3(value);
        case "Vec4":
            return new Shade.Vec4(value);
        case KINDS.MATRIX3:
            return new Shade.Mat3(value);
        case KINDS.MATRIX4:
            return new Shade.Mat4(value);
        default:
            throw new Error("Can't copy static value of kind: " + typeInfo.getKind());
    }
};

TypeInfo.prototype = {
    getType: function () {
        return this.type;
    },

    setKind: function (kind) {
        this.info.kind = kind;
    },

    getKind: function () {
        if (!(this.isObject() || this.isFunction()))
            return null;
        return this.info.kind || KINDS.ANY;
    },

    getUserData: function () {
        var extra = this.info;
        if (!extra.userData) extra.userData = {};
        return extra.userData;
    },

    getArrayElementType: function () {
        if (!this.isArray())
            throw new Error("Called getArrayElementType on " + this.getType());
        return this.info.elements;
    },

    isOfKind: function (kind) {
        if (!this.isObject()) {
            return false;
        }
        return this.getKind() == kind;
    },

    /**
     * @param {string} type
     * @param {string?} kind
     */
    setType: function (type, kind) {
        var extra = this.info;
        extra.type = type;
        if (kind)
            this.setKind(kind);
        if (this.isValid())
            this.clearError();
    },

    setInvalid: function (message) {
        this.setType(TYPES.INVALID);
        if (message)
            this.setError(message);
    },

    isOfType: function (type) {
        return this.getType() == type;
    },

    equals: function (other) {
        return this.getType() == other.getType() && this.getKind() == other.getKind();
    },

    isInt: function () {
        return this.isOfType(TYPES.INT);
    },
    isNumber: function () {
        return this.isOfType(TYPES.NUMBER);
    },
    isValid: function () {
        return !this.isOfType(TYPES.INVALID);
    },
    isNullOrUndefined: function () {
        return this.isNull() || this.isUndefined();
    },
    isNull: function () {
        return this.isOfType(TYPES.NULL);
    },
    isUndefined: function () {
        return this.isOfType(TYPES.UNDEFINED);
    },
    isBool: function () {
        return this.isOfType(TYPES.BOOLEAN);
    },
    isString: function () {
        return this.isOfType(TYPES.STRING);
    },
    isArray: function () {
        return this.isOfType(TYPES.ARRAY);
    },
    isFunction: function () {
        return this.isOfType(TYPES.FUNCTION);
    },
    isObject: function () {
        return this.isOfType(TYPES.OBJECT);
    },
    isVector: function () {
        return this.isObject() && this.isOfKind(KINDS.FLOAT2) || this.isOfKind(KINDS.FLOAT3) || this.isOfKind(KINDS.FLOAT4);
    },
    isGlobal: function () {
        return !!this.info.global;
    },
    setGlobal: function (global) {
        var extra = this.info;
        extra.global = global;
    },
    isOutput: function () {
        return !!this.info.output;
    },
    setOutput: function (output) {
        var extra = this.info;
        extra.output = output;
    },
    canNumber: function () {
        return this.isNumber() || this.isInt() || this.isBool();
    },
    canInt: function () {
        return this.isInt() || this.isBool();
    },
    canObject: function () {
        return this.isObject() || this.isArray() || this.isFunction();
    },
    setCommonType: function (a, b) {
        if (a.equals(b)) {
            this.copyFrom(a);
            return true;
        }
        if (a.canNumber() && b.canNumber()) {
            this.setType(TYPES.NUMBER);
            return true;
        }
        return false;
    },
    hasConstantValue: function () {
        var extra = this.info;
        if (this.isNullOrUndefined())
            return true;
        return extra.hasOwnProperty("constantValue");
    },
	getConstantValue: function () {
        if (!this.hasConstantValue()) {
            throw new Error("Node has no static value: " + this.node);
        }
        if (this.isNull())
            return null;
        if (this.isUndefined())
            return undefined;
        return this.info.constantValue;
    },
    setConstantValue: function (v) {
        var extra = this.info;
        if (this.isNullOrUndefined())
            throw new Error("Null and undefined have predefined values.");
        extra.constantValue = v;
    },
    canUniformExpression: function () {
        return this.hasStaticValue() || this.isUniformExpression();
    },

    isUniformExpression: function () {
        var extra = this.info;
        return extra.hasOwnProperty("uniformDependencies")
    },
    setUniformDependencies: function () {
        var extra = this.info;
        var dependencies = new Set();
        var args = Array.prototype.slice.call(arguments);
        args.forEach(function (arg) {
            if (Array.isArray(arg))
                dependencies = Set.union(dependencies, arg);
            else
                dependencies.add(arg);
        });
        extra.uniformDependencies = dependencies.values();
    },
    getUniformDependencies: function () {
        var extra = this.info;
        return extra.uniformDependencies || [];
    },
    getUniformCosts: function () {
        var extra = this.info;
        return extra.uniformCosts | 0;
    },
    setUniformCosts: function (costs) {
        var extra = this.info;
        extra.uniformCosts = costs;
    },
    clearUniformDependencies: function () {
        var extra = this.info;
        delete extra.uniformDependencies;
    },

    setDynamicValue: function () {
        delete this.info.constantValue;
    },
    setCall: function (call) {
        var extra = this.info;
        extra.evaluate = call;
    },
    getCall: function () {
        return this.info.evaluate;
    },
    clearCall: function () {
        var extra = this.info;
        delete extra.evaluate;
    },
    copyFrom: function (other) {
		assert(other instanceof TypeInfo);
        extend(this.info, other.info);
    },
    str: function () {
        var extra = this.info;
        return JSON.stringify(extra, null, 1);
    },
    canNormal: function () {
        return this.isObject() && (this.isOfKind(KINDS.NORMAL) || this.isOfKind(KINDS.FLOAT3));
    },
    canColor: function () {
        return this.isObject() && (this.isOfKind(KINDS.FLOAT4) || this.isOfKind(KINDS.FLOAT3));
    },
    hasError: function () {
        return this.getError() != null;
    },
    getError: function () {
        var extra = this.info;
        return extra.error;
    },
    setError: function (err) {
        var extra = this.info;
        extra.error = err;
    },
    clearError: function () {
        var extra = this.info;
        extra.error = null;
    },
    setFromExtra: function (extra) {
        extend(this.info, extra);
        // Set static object extra: This might be an object
        if (extra.constantValue != undefined) {
            this.setConstantValue(TypeInfo.copyStaticValue(this, extra.constantValue));
        }
    },

	hasProperty: function (name) {
        if (this.isObject() && this.getKind()) {
            var obj = TypeSystem.getPredefinedObject(this.getKind());
            return (obj.properties && obj.properties.hasOwnProperty(name)) || (obj.prototype && obj.prototype.hasOwnProperty(name));
        }
        return false;
    },


    isPredefinedObject: function() {
        return this.isObject && this.getKind();
    },

	getPropertyInfo: function (name) {
        if (this.isPredefinedObject()) {
            var predefinedType = TypeSystem.getPredefinedObject(this.getKind());
            var property = predefinedType.properties ? predefinedType.properties[name] : (predefinedType.prototype ? predefinedType.prototype[name] : null);
			if (property) {
				if (typeof property == "function") {
					return new TypeInfo({type: "function", evaluate: property });
				}
                return new TypeInfo(property);
            }
            return null;
        }
        return null;
    },

    canEvaluate: function () {
        return this.isFunction() && typeof this.info.evaluate == "function";
    },

    evaluate: function (typeInfo, args, scope, objectReference) {
        assert(this.canEvaluate());
        return this.info.evaluate(typeInfo, args, scope, objectReference);
    },

    canComputeStaticValue: function () {
        return this.isFunction() && typeof this.info.computeStaticValue == "function";
    },

    computeStaticValue: function (typeInfo, args, scope, objectReference) {
        assert(this.canComputeStaticValue());
        return this.info.computeStaticValue(typeInfo, args, scope, objectReference);
    },

    getNodeInfo: function () {
        if (this.isObject())
            return this.info.info;
    },
    setNodeInfo: function (info) {
        if (!this.isObject())
            throw new Error("Only objects may have a node info");
        this.info.info = info;
    },
    getTypeString: function () {
        if (this.isObject()) {
            return this.isOfKind(KINDS.ANY) ? "Object" : ("Object #<" + this.getKind() + ">");
        }
        return this.getType();
    },
    /**
     * Get the internal type as JavaScript type
     * @returns {string}
     */
    getJavaScriptTypeString: function () {
        //noinspection FallthroughInSwitchStatementJS
        switch (this.getType()) {
            case TYPES.INT:
            case TYPES.FLOAT:
            case TYPES.NUMBER:
                return "number";
            case TYPES.OBJECT:
            case TYPES.ARRAY:
                return "object";
            case TYPES.STRING:
                return "string";
            case TYPES.UNDEFINED:
                return "undefined";
            case TYPES.FUNCTION:
                return "function";
            default:
                // TODO: For debug we use this now, should throw an exception
                return "?" + this.getType();
        }
    },
    setSource: function (source) {
        var extra = this.info;
        extra.source = source;
    },
    getSource: function () {
        return this.info.source;
    },

	isDerived: function () {
        return this.info.derived == true;
    },
    getStaticTruthValue: function () {
        // !!undefined == false;
        if (this.isNullOrUndefined())
            return false;
        // !!{} == true
        if (this.canObject())
            return true;
        // In all other cases, it depends on the value,
        // thus we can only evaluate this for static objects
        if (this.hasConstantValue()) {
            return !!this.getConstantValue();
        }
        return undefined;
    },
    setSemantic: function (sem) {
        this.info.semantic = sem;
    },
    getSemantic: function () {
        return this.info.semantic;
    },
	getReturnInfo: function () {
        return this.info.returnInfo;
    },
    setReturnInfo: function (info) {
        this.info.returnInfo = info;
    }

};


module.exports.TypeInfo = TypeInfo;


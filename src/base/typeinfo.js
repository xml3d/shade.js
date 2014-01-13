(function(ns){

    var Shade = require("../interfaces.js"),
        Syntax = require('estraverse').Syntax,
        Base = require("./index.js"),
        Set = require('analyses').Set;

    var TYPES = Shade.TYPES,
        KINDS = Shade.OBJECT_KINDS;


    /**
     * @param {*} node Carrier object for the type info, only node.extra gets polluted
     * @param {Object?} extra
     * @constructor
     */
    var TypeInfo = function (node, extra) {
        this.node = node;
        this.node.extra = this.node.extra || {};
        if (extra) {
            Base.shallowExtend(this.node.extra, extra);
        }
    }

    TypeInfo.createForContext = function(node, ctx) {
        var result = new TypeInfo(node);
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
    }

       /**
     * @param {TypeInfo} typeInfo
     * @param {Object?} value
     */
    TypeInfo.copyStaticValue = function(typeInfo, value) {
        value = value || typeInfo.getStaticValue();
        // We don't have to copy primitive types
        if(!typeInfo.isObject())
            return value;
        switch(typeInfo.getKind()) {
            case KINDS.FLOAT2: return new Shade.Vec2(value);
            case KINDS.FLOAT3: return new Shade.Vec3(value);
            case KINDS.FLOAT4: return new Shade.Vec4(value);
            case KINDS.MATRIX3: return new Shade.Mat3(value);
            case KINDS.MATRIX4: return new Shade.Mat4(value);
            default: throw new Error("Can't copy static value of kind: " + typeInfo.getKind());
        }
    }

    TypeInfo.prototype = {
        getExtra: function () {
            return this.node.extra;
        },
        getType: function () {
            var extra = this.getExtra();
            if (extra.type != undefined)
                return extra.type;
            return TYPES.ANY;
        },

        setKind: function (kind) {
            var extra = this.getExtra();
            extra.kind = kind;
        },

        getKind: function () {
            if (!this.isObject())
                return null;
            return this.getExtra().kind || KINDS.ANY;
        },

        getUserData: function () {
            var extra = this.getExtra();
            if(!extra.userData) extra.userData = {};
            return extra.userData;
        },

        getArrayElementType: function () {
            if(!this.isArray())
                throw new Error("Called getArrayElementType on " + this.getType());
            return this.getExtra().elements;
        },

        isOfKind: function(kind) {
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
            var extra = this.getExtra();
            extra.type = type;
            if (kind)
                this.setKind(kind);
            if(this.isValid())
                this.clearError();
        },

        setInvalid: function(message) {
            this.setType(TYPES.INVALID);
            if(message)
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
        isGlobal: function() {
            return !!this.getExtra().global;
        },
        setGlobal: function (global) {
            var extra = this.getExtra();
            extra.global = global;
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
        setCommonType: function(a,b) {
            if(a.equals(b)) {
                this.copy(a);
                return true;
            }
            if(a.canNumber() && b.canNumber()) {
                this.setType(TYPES.NUMBER)
                return true;
            }
            return false;
        },
        hasStaticValue : function() {
            var extra = this.getExtra();
            if (this.isNullOrUndefined())
                return true;
            return extra.hasOwnProperty("staticValue");
        },
        setStaticValue : function(v) {
            var extra = this.getExtra();
            if (this.isNullOrUndefined())
                throw new Error("Null and undefined have predefined values.");
            extra.staticValue = v;
        },
        canUniformExpression: function() {
            return this.hasStaticValue() || this.isUniformExpression();
        },

        isUniformExpression: function() {
            var extra = this.getExtra();
            return extra.hasOwnProperty("uniformDependencies")
        },
        setUniformDependencies: function() {
            var extra = this.getExtra();
            var dependencies = new Set();
            var args = Array.prototype.slice.call(arguments);
            args.forEach(function(arg) {
               if(Array.isArray(arg))
                   dependencies = Set.union(dependencies, arg);
                else
                   dependencies.add(arg);
            });
            extra.uniformDependencies = dependencies.values();
        },
        getUniformDependencies: function() {
            var extra = this.getExtra();
            return extra.uniformDependencies || [];
        },
        getUniformCosts: function() {
            var extra = this.getExtra();
            return extra.uniformCosts | 0;
        },
        setUniformCosts: function(costs) {
            var extra = this.getExtra();
            extra.uniformCosts = costs;
        },
        clearUniformDependencies: function() {
            var extra = this.getExtra();
            delete extra.uniformDependencies;
        },
        getStaticValue : function() {
            if (!this.hasStaticValue()) {
                throw new Error("Node has no static value: " + this.node);
            }
            if (this.isNull())
                return null;
            if (this.isUndefined())
                return undefined;
            return this.getExtra().staticValue;
        },
        setDynamicValue : function() {
            delete this.getExtra().staticValue;
        },
        setCall : function(call) {
            var extra = this.getExtra();
            extra.evaluate = call;
        },
        getCall : function() {
            return this.getExtra().evaluate;
        },
        clearCall: function() {
            var extra = this.getExtra();
            delete extra.evaluate;
        },
        copy: function(other) {
            this.setFromExtra(other.getExtra());
        },
        str: function() {
            var extra = this.getExtra();
            return JSON.stringify(extra, null, 1);
        },
        canNormal: function() {
            return this.isObject() && (this.isOfKind(KINDS.NORMAL) || this.isOfKind(KINDS.FLOAT3));
        },
        canColor: function() {
            return this.isObject() && (this.isOfKind(KINDS.FLOAT4) || this.isOfKind(KINDS.FLOAT3));
        },
        hasError : function() {
            return this.getError() != null;
        },
        getError : function() {
            var extra = this.getExtra();
            return extra.error;
        },
        setError : function(err) {
            var extra = this.getExtra();
            extra.error = err;
        },
        clearError : function() {
            var extra = this.getExtra();
            extra.error = null;
        },
        setFromExtra: function(extra){
            Base.shallowExtend(this.node.extra, extra);
            // Set static object extra: This might be an object
            if (extra.staticValue != undefined) {
                this.setStaticValue(TypeInfo.copyStaticValue(this, extra.staticValue));
            }
        },
        getNodeInfo: function() {
            if (this.isObject())
                return this.getExtra().info;
        },
        setNodeInfo: function(info) {
            if (!this.isObject())
                throw new Error("Only objects may have a node info");
            this.getExtra().info = info;
        },
        getTypeString: function() {
            if (this.isObject()) {
                return this.isOfKind(KINDS.ANY) ? "Object" : ("Object #<" + this.getKind() + ">");
            }
            return this.getType();
        },
        setSource: function(source) {
            var extra = this.getExtra();
            extra.source = source;
        },
        getSource: function() {
            return this.getExtra().source;
        },
        getStaticProperties: function() {
            // Only bound object have static properties (Math, Shade etc)
            return null;
        },
        isDerived: function() {
            return this.getExtra().derived == true;
        },
        getStaticTruthValue: function() {
            // !!undefined == false;
            if (this.isNullOrUndefined())
                return false;
            // !!{} == true
            if (this.canObject())
                return true;
            // In all other cases, it depends on the value,
            // thus we can only evaluate this for static objects
            if (this.hasStaticValue()) {
                return !!this.getStaticValue();
            }
            return undefined;
        },
        setSemantic: function(sem) {
            this.getExtra().semantic = sem;
        },
        getSemantic: function(sem) {
            return this.getExtra().semantic;
        }

    }




    ns.TypeInfo = TypeInfo;

}(exports));

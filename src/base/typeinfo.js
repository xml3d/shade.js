(function(ns){

    var Shade = require("../interfaces.js"),
        Syntax = require('estraverse').Syntax,
        Base = require("./index.js");

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
            Base.deepExtend(this.node.extra, extra);
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
            return new TypeInfo(node, variable);
        }
        return result;
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
        hasStaticValue : function() {
            var extra = this.getExtra();
            if (this.isNullOrUndefined())
                return true;
            return extra.hasOwnProperty("staticValue");
        },
        setStaticValue : function(v) {
            var extra = this.getExtra();
            if (this.isNullOrUndefined())
                throw("Null and undefined have predefined values.");
            extra.staticValue = v;
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
        eliminate : function() {
            var extra = this.getExtra();
            extra.eliminate = true;
        },
        canEliminate : function() {
            var extra = this.getExtra();
            return extra.eliminate == true;
        },
        setFromExtra: function(extra){
            Base.deepExtend(this.node.extra, extra);
            // Set static object extra: This might be an object
            if (extra.staticValue != undefined)
                this.setStaticValue(extra.staticValue);
        },
        getNodeInfo: function() {
            if (this.isObject())
                return this.getExtra().info;
        },
        getTypeString: function() {
            if (this.isObject())
                return "Object #<" + this.getKind() + ">";
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
        }

    }

    ns.TypeInfo = TypeInfo;

}(exports));

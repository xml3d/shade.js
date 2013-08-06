(function(ns){

    var Shade = require("../interfaces.js"),
        Syntax = require('estraverse').Syntax,
        Base = require("./index.js");

    var TYPES = Shade.TYPES,
        KINDS = Shade.OBJECT_KINDS;


    var Annotation = function (node, extra) {
        this.node = node;
        this.node.extra = this.node.extra || {};
        if (extra) {
            Base.deepExtend(this.node.extra, extra);
        }
    }

    Annotation.createForContext = function(node, ctx) {
        var result = new Annotation(node);
        if (result.getType() !== TYPES.ANY) {
            return result;
        }

        if (node.type == Syntax.Identifier) {
            var name = node.name;
            var variable = ctx.findVariable(name);
            return new Annotation(node, variable);
        }
        return result;
    }

    Annotation.prototype = {
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
        isObject: function () {
            return this.isOfType(TYPES.OBJECT);
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
            this.setType(other.getType());
            if (other.getKind())
                this.setKind(other.getKind());
            if (other.hasStaticValue() && !other.isNullOrUndefined()) {
                this.setStaticValue(other.getStaticValue());
            } else {
                this.setDynamicValue();
            }
            this.setGlobal(other.isGlobal());
            if(other.getCall())
                this.setCall(other.getCall());
        },
        str: function() {
            var extra = this.getExtra();
            return JSON.stringify(extra, null, 1);
        },
        canNormal: function() {
            return this.isObject() && (this.isOfKind(KINDS.NORMAL) || this.isOfKind(KINDS.FLOAT3));
        },
        canColor: function() {
            return this.isObject() && (this.isOfKind(KINDS.COLOR) || this.isOfKind(KINDS.FLOAT3));
        },
        eliminate : function() {
            var extra = this.getExtra();
            extra.eliminate = true;
        },
        canEliminate : function() {
            var extra = this.getExtra();
            return extra.eliminate == true;
        },
        isGlobal: function() {
            var extra = this.getExtra();
            return extra.global == true;
        },
        setGlobal: function(val) {
            var extra = this.getExtra();
            return extra.global = val;
        }
    }

    /**
     * @param {object} node
     * @param {object} extra
     * @extends Annotation
     * @constructor
     */
    var FunctionAnnotation = function (node, extra) {
        Annotation.call(this, node, extra);
        this.setType(TYPES.FUNCTION);
        //this.updateReturnType(TYPES.UNDEFINED);
    };

    Base.createClass(FunctionAnnotation, Annotation, {
        getReturnInfo: function() {
            return this.getExtra().returnInfo;
        },
        setReturnInfo: function(info) {
            this.getExtra().returnInfo = info;
        }
    });

    ns.Annotation = Annotation;
    ns.FunctionAnnotation = FunctionAnnotation;

}(exports));

(function(ns){

    Shade = require("../../interfaces.js").Shade;
    var TYPES = Shade.TYPES;
    var KINDS = Shade.OBJECT_KINDS;


    var Node = function (node) {
        this.node = node;
        this.node.extra = this.node.extra || {};
    }

    Node.prototype = {
        _getExtra: function () {
            return this.node.extra;
        },
        getType: function () {
            var extra = this._getExtra();
            return extra.type || TYPES.ANY;
        },

        setKind: function (kind) {
           var extra = this._getExtra();
            extra.kind = kind;
        },

        getKind: function () {
            if (!this.isObject())
                return null;
            return this._getExtra().kind || KINDS.ANY;
        },

        isOfKind: function(kind) {
            if (!this.isObject()) {
                return false;
            }
            return this.getKind() == kind;
        },

        setType: function (type) {
            var extra = this._getExtra();
            extra.type = type;
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
            var extra = this._getExtra();
            return extra.hasOwnProperty("staticValue");
        },
        setStaticValue : function(v) {
            var extra = this._getExtra();
            extra.staticValue = v;
        },
        getStaticValue : function() {
            if (!this.hasStaticValue()) {
                throw new Error("Node has no static value: " + this.node);
            }
            return this._getExtra().staticValue;
        },
        setDynamicValue : function() {
            delete this._getExtra().staticValue;
        },
        setCall : function(call) {
            var extra = this._getExtra();
            extra.evaluate = call;
        },
        getCall : function() {
            return this._getExtra().evaluate;
        },
        clearCall: function() {
            var extra = this._getExtra();
            delete extra.evaluate;
        },
        copy: function(other) {
            this.setType(other.getType());
            if (other.getKind())
                this.setKind(other.getKind());
            if (other.hasStaticValue()) {
                this.setStaticValue(other.getStaticValue());
            } else {
                this.setDynamicValue();
            }
            if(other.getCall())
                this.setCall(other.getCall());
        },
        str: function() {
            var extra = this._getExtra();
            return JSON.stringify(extra, null, 1);
        }
    }

    ns.Node = Node;

}(exports));

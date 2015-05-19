(function(ns){

    var Shade = require("../interfaces.js"),
        Syntax = require('estraverse').Syntax,
        Base = require("./index.js"),
        TypeInfo = require("./typeinfo.js").TypeInfo;

    var TYPES = Shade.TYPES,
        KINDS = Shade.OBJECT_KINDS;


    /**
     * @param {object} node
     * @param {object} extra
     * @extends TypeInfo
     * @constructor
     */
    var Annotation = function (node, extra) {
        TypeInfo.call(this, node, extra);
    };

    Base.createClass(Annotation, TypeInfo, {

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
        }

    });


    /**
     * @param {object} node
     * @param {object} extra
     * @extends Annotation
     * @constructor
     */
    var FunctionAnnotation = function (node, extra) {
        Annotation.call(this, node, extra);
        this.setType(TYPES.FUNCTION);
    };

    Base.createClass(FunctionAnnotation, Annotation, {
        getReturnInfo: function() {
            return this.getExtra().returnInfo;
        },
        setReturnInfo: function(info) {
            this.getExtra().returnInfo = info;
        },
        isUsed: function() {
            return !!this.getExtra().used;
        },
        setUsed: function(v) {
            this.getExtra().used = v;
        }
    });

    ns.Annotation = Annotation;
    ns.FunctionAnnotation = FunctionAnnotation;
    ns.ANNO = function(object, extra){return new Annotation(object, extra)};

}(exports));

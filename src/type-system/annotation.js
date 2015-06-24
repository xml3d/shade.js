// External dependencies
var util = require("util");
var extend = require("lodash.assign");
var Syntax = require('estraverse').Syntax;

var TYPES = require("./constants.js").TYPES;
var TypeInfo = require("./typeinfo.js").TypeInfo;



/**
 * @param {object} node
 * @param {object} extra
 * @extends TypeInfo
 * @constructor
 */
var Annotation = function (node, extra) {
    TypeInfo.call(this, node, extra);
};

util.inherits(Annotation, TypeInfo);

extend(Annotation.prototype, {

    setCall: function (call) {
        var extra = this.getExtra();
        extra.evaluate = call;
    },
    getCall: function () {
        return this.getExtra().evaluate;
    },
    clearCall: function () {
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

util.inherits(FunctionAnnotation, Annotation);


extend(FunctionAnnotation.prototype, {
    getReturnInfo: function () {
        return this.getExtra().returnInfo;
    },
    setReturnInfo: function (info) {
        this.getExtra().returnInfo = info;
    },
    isUsed: function () {
        return !!this.getExtra().used;
    },
    setUsed: function (v) {
        this.getExtra().used = v;
    }
});

module.exports = {
    Annotation: Annotation,
    FunctionAnnotation: FunctionAnnotation,
    ANNO: function (object, extra) {
        return new Annotation(object, extra)
    }
};


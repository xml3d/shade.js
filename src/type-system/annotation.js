// External dependencies
var util = require("util");
var extend = require("lodash.assign");
var Syntax = require('estraverse').Syntax;

var TYPES = require("./constants.js").TYPES;
var TypeInfo = require("./typeinfo.js").TypeInfo;



/**
 * @param {object} info
 * @extends TypeInfo
 * @constructor
 */
var Annotation = function (info) {
    TypeInfo.call(this, info);
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
 * @param {object} info
 * @extends Annotation
 * @constructor
 */
var FunctionAnnotation = function (info) {
    Annotation.call(this, info);
    this.setType(TYPES.FUNCTION);
};

util.inherits(FunctionAnnotation, Annotation);


extend(FunctionAnnotation.prototype, {
    getReturnInfo: function () {
        return this.info.returnInfo;
    },
    setReturnInfo: function (info) {
        this.info.returnInfo = info;
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
    ANNO: function (node) {
		node.extra = node.extra || { type: TYPES.ANY };

        return new TypeInfo(node.extra);
    }
};


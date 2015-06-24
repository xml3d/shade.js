(function(ns){

    ns.extend = require("lodash.assign");



    ns.deepExtend = function(destination, source) {
        for (var property in source) {
            var srcValue = source[property];
            var dstValue = destination[property];
            var copy;
            if (Array.isArray(srcValue)) {
                copy = dstValue || [];
                ns.deepExtend(copy, srcValue);
            } else if (typeof srcValue === "object" && srcValue !== null) {
                copy = dstValue || {};
                ns.deepExtend(copy, srcValue);
            } else {
                copy = srcValue;
            }
            destination[property] = copy;
        }
        return destination;
    };

    ns.shallowExtend = function(destination, source) {
        for (var property in source) {
            destination[property] = source[property];
        }
        return destination;
    };

    /**
     *
     * @param {Object} ctor Constructor
     * @param {Object} parent Parent class
     * @param {Object=} methods Methods to add to the class
     * @return {Object!}
     */
    ns.createClass = function(ctor, parent, methods) {
        methods = methods || {};
        if (parent) {
            /** @constructor */
            var F = function() {
            };
            F.prototype = parent.prototype;
            ctor.prototype = new F();
            ctor.prototype.constructor = ctor;
            ctor.superclass = parent.prototype;
        }
        for ( var m in methods) {
            ctor.prototype[m] = methods[m];
        }
        return ctor;
    };


}(exports))

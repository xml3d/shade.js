(function(ns){

    ns.extend = function(a, b) {
        for ( var prop in b) {
            var g = b.__lookupGetter__(prop), s = b.__lookupSetter__(prop);
            if (g||s) {
                if (g) {
                    a.__defineGetter__(prop, g);
                }
                if (s) {
                    a.__defineSetter__(prop, s);
                }
            } else {
                if (b[prop] === undefined) {
                    delete a[prop];
                } else if (prop !== "constructor" || a !== window) {
                    a[prop] = b[prop];
                }
            }
        }
        return a;
    };



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

(function(ns){

    var Base = {};

    Base.extend = function(a, b) {
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

    Base.deepExtend = function(destination, source) {
        for (var property in source) {
            if (typeof source[property] === "object" && source[property] !== null && destination[property]) {
                Base.deepExtend(destination[property], source[property]);
            } else {
                destination[property] = source[property];
            }
        }
    };

    /**
     *
     * @param {Object} ctor Constructor
     * @param {Object} parent Parent class
     * @param {Object=} methods Methods to add to the class
     * @return {Object!}
     */
    Base.createClass = function(ctor, parent, methods) {
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
        ctor.isSuperclassOf = XML3D.isSuperclassOf.bind(ctor, ctor);
        for ( var m in methods) {
            ctor.prototype[m] = methods[m];
        }
        return ctor;
    };

    ns.Base = Base;

}(exports))

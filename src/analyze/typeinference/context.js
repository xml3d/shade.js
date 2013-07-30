(function(ns){

    var Base = require("../../base/index.js").Base,
        Annotation = require("./../../base/annotation.js").Annotation;

    /**
     * @param {Context|null} parent
     * @param opt
     * @constructor
     */
    var Context = function(parent, opt) {
        opt = opt || {};

        /** @type (Context|null) */
        this.parent = parent || opt.parent || null;

        /** @type {Object.<string, {initialized: boolean, annotation: Annotation}>} */
        this.bindings = opt.bindings || {};

    };

    Base.extend(Context.prototype, {

        /**
         *
         * @param {string} name
         * @returns {*}
         */
        findVariable: function(name) {
            if(this.bindings[name] !== undefined)
                return this.bindings[name];
            if (this.parent)
                return this.parent.findVariable(name);
            return undefined;
        },

        declareVariable: function(name) {
            this.bindings[name] = { annotation: new Annotation({}), initialized : false };
        },

        /**
         *
         * @param {string} name
         * @param {Annotation} annotation
         */
        updateExpression: function(name, annotation) {
            var v = this.findVariable(name);
            if(!v) {
                throw new Error("Variable was not declared in this scope: " + name);
            }
            if(v.initialized) {
                if (v.annotation.getType() !== annotation.getType())
                    throw new Error("Variable may not change it's type: " + name);
            } else {
                v.annotation = annotation;
                v.initialized = true;
            }

        },

        registerObject: function(name, obj) {
            this.bindings[name] = obj;
        },

        findObject : function(name) {
            return this.findVariable(name);
        }


    });


    ns.Context = Context;



}(exports));

(function(ns){

    var Base = require("../../base/index.js").Base,
        Annotation = require("./../../base/annotation.js").Annotation,
        TYPES = require("../../interfaces.js").Shade.TYPES;


    var c_object_registry = {};

    /**
     * @param {Context|null} parent
     * @param opt
     * @constructor
     */
    var Context = function(node, parent, opt) {
        opt = opt || {};

        /** @type (Context|null) */
        this.parent = parent || opt.parent || null;

        this.context = node.context = node.context || {};

        /** @type {Object.<string, {initialized: boolean, annotation: Annotation}>} */
        this.context.bindings = opt.bindings || {};

        this.context.name = opt.name || "<anonymous>";

    };

    Base.extend(Context.prototype, {

        getBindings: function() {
            return this.context.bindings;
        },
        /**
         *
         * @param {string} name
         * @returns {*}
         */
        findVariable: function(name) {
            var bindings = this.getBindings();
            if(bindings[name] !== undefined)
                return bindings[name];
            if (this.parent)
                return this.parent.findVariable(name);
            return undefined;
        },

        declareVariable: function(name) {
            var bindings = this.getBindings();
            var init = {
                initialized : false,
                type: TYPES.UNDEFINED
            };
            bindings[name] = init;
        },

        /**
         *
         * @param {string} name
         * @param {Annotation} annotation
         */
        updateExpression: function (name, annotation) {
            var v = this.findVariable(name);
            if (!v) {
                throw new Error("Variable was not declared in this scope: " + name);
            }
            if (v.initialized && v.type !== annotation.getType()) {
                throw new Error("Variable may not change it's type: " + name);
            }
            for (var prop in v) { if (v.hasOwnProperty(prop)) { delete v[prop]; } }
            Base.extend(v, annotation.getExtra());
            v.initialized = true;

        },

        registerObject: function(name, obj) {
            var id = obj.getId();
            c_object_registry[id] = obj;
            var bindings = this.getBindings();
            bindings[name] = id;
        },

        findObject : function(name) {
            var id = this.findVariable(name);
            return c_object_registry[id].getEntry();
        }


    });


    ns.Context = Context;



}(exports));

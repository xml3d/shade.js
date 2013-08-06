(function(ns){

    var Base = require("../base/index.js"),
        TYPES = require("../interfaces.js").TYPES;


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

        getName: function() {
            return this.context.name;
        },

        getBindings: function() {
            return this.context.bindings;
        },

        updateReturnInfo: function(annotation) {
            this.context.returnInfo = annotation.getExtra();
        },
        getReturnInfo: function() {
            return this.context.returnInfo;
        },

        /**
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

        /**
         * @param {string} name
         * @returns {Context|null}
         */
        getContextByName: function(name) {
            var bindings = this.getBindings();
            if(bindings[name] !== undefined)
                return this;
            if (this.parent)
                return this.parent.getContextByName(name);
            return null;
        },

        getVariableIdentifier: function(name) {
            var context = this.getContextByName(name);
            if(!context)
                return null;
            return context.str() + "." + name;
        },

        declareVariable: function(name) {
            var bindings = this.getBindings();
            if (bindings[name])
                throw new Error(name + " was already declared in this scope.")
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
            v.initialized = !annotation.isUndefined();

        },

        registerObject: function(name, obj) {
            var id = obj.getId();
            c_object_registry[id] = obj;
            var bindings = this.getBindings();
            bindings[name] = id;
        },

        findObject : function(name) {
            var id = this.findVariable(name);
            var obj = c_object_registry[id];
            return obj && obj.getEntry ? obj.getEntry() : id;
        },

        declareParameters: function(params) {
            var bindings = this.getBindings();
            this.params = [];
            for(var i = 0; i < params.length; i++) {
                var parameter = params[i];
                this.params[i] = parameter.name;
                bindings[parameter.name] = { type: TYPES.UNDEFINED };
            }
        },

        updateParameters: function(params) {
            for(var i = 0; i< params.length; i++) {
                if (i == this.params.length)
                    break;
                var param = params[i];
                var name = this.params[i];
                var bindings = this.getBindings();
                bindings[name] = param;
            }
        },

        str: function() {
            var ctx = this;
            var names = [];
            while(ctx) {
                names.unshift(ctx.getName());
                ctx = ctx.parent;
            }
            return names.join(".");
        }


    });


    ns.Context = Context;



}(exports));

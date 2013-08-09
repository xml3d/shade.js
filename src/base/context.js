(function(ns){

    var Base = require("./index.js"),
        TYPES = require("../interfaces.js").TYPES,
        Annotation = require("./annotation.js").Annotation,
        TypeInfo = require("./typeinfo.js").TypeInfo,
        Syntax = require('estraverse').Syntax;


    var c_object_registry = {},
        c_instance_registry = {};

    /**
     *
     * @param binding
     * @extends TypeInfo
     * @constructor
     */
    var Binding = function(binding) {
        TypeInfo.call(this, binding);
        if(this.node.ref) {
            this.globalObject = c_object_registry[this.node.ref].object;
            if (this.globalObject) {
                this.setType(TYPES.OBJECT);
            }
        }
    };


    Base.createClass(Binding, TypeInfo, {
        hasConstructor: function() {
            return !!this.getConstructor();
        },
        getConstructor: function() {
            return this.globalObject && this.globalObject.constructor;
        },
        isInitialized: function() {
            return this.node.initialized;
        },
        setInitialized: function(v) {
            this.node.initialized = v;
        },
        hasStaticValue: function() {
            return false;
        },
        getType: function() {
            return this.globalObject? TYPES.OBJECT : TypeInfo.prototype.getType.call(this);
        },
        getObjectInfo: function() {
            if (this.globalObject)
                return this.globalObject.static;
            if (this.isObject())
                return c_instance_registry[this.getKind()];
            return null;
        }
    })


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
        this.context.bindings = this.context.bindings || {};
        if(opt.bindings) {
            Base.extend(this.context.bindings, opt.bindings);
        }

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
        getBindingByName: function(name) {
            var bindings = this.getBindings();
            if(bindings[name] !== undefined)
                return new Binding(bindings[name]);
            if (this.parent)
                return this.parent.getBindingByName(name);
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

        declareVariable: function(name, fail) {
            var bindings = this.getBindings();
            fail = (fail == undefined) ? true : fail;
            if (bindings[name]) {
                if (fail) {
                    throw new Error(name + " was already declared in this scope.")
                } else {
                    return;
                }
            }

            var init = {
                initialized : false,
                extra: {
                    type: TYPES.UNDEFINED
                }
            };
            bindings[name] = init;
        },

        /**
         *
         * @param {string} name
         * @param {TypeInfo} typeInfo
         */
        updateExpression: function (name, typeInfo) {
            var v = this.getBindingByName(name);
            if (!v) {
                throw new Error("Variable was not declared in this scope: " + name);
            }
            if (v.isInitialized() && v.getType() !== typeInfo.getType()) {
                throw new Error("Variable may not change it's type: " + name);
            }
            v.copy(typeInfo);
            v.setDynamicValue();
            v.setInitialized(!typeInfo.isUndefined());
        },

        registerObject: function(name, obj) {
            c_object_registry[obj.id] = obj;
            if(obj.kind) {
                c_instance_registry[obj.kind] = obj.instance;
            }
            var bindings = this.getBindings();
            bindings[name] = {
                extra: {
                    type: TYPES.OBJECT
                },
                ref: obj.id
            };
        },

        /*findObject : function(name) {
            var id = this.getBindingByName(name);
            var obj = c_object_registry[id];
            return obj && obj.getEntry ? obj.getEntry() : id;
        },*/

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
        },

        getAllBindings: function() {
            var result = Object.keys(this.getBindings());
            if (this.parent) {
                var parentBindings = this.parent.getAllBindings();
                for(var i = 0; i < parentBindings.length; i++) {
                    if (result.indexOf(parentBindings[i]) !== -1) {
                        result.push(parentBindings[i]);
                    }
                }
            }
            return result;
        },

        /**
         *
         * @param node
         * @returns {TypeInfo}
         */
        createTypeInfo: function (node) {
            var result = new Annotation(node);
            if (result.getType() !== TYPES.ANY) {
                return result;
            }

            if (node.type == Syntax.Identifier) {
                var name = node.name;
                return this.getBindingByName(name);
            }
            return result;
        }

    });


    ns.Context = Context;



}(exports));

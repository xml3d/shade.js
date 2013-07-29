(function(ns){

    var Base = require("../../base/index.js").Base,
        TYPES = require("../../interfaces.js").Shade.TYPES,
        Node = require("./../../base/node.js").Node;

    var Context = function(parent, opt) {
        opt = opt || {};
        this.parent = parent || opt.parent || null;
        this.variables = opt.variables || {};

    };

    Base.extend(Context.prototype, {

        findVariable: function(name) {
            if(this.variables[name] !== undefined)
                return this.variables[name];
            if (this.parent)
                return this.parent.findVariable(name);
            return undefined;
        },

        declareVariable: function(name) {
            this.variables[name] = { expression: new Node({}), initialized : false };
        },

        updateExpression: function(name, exp) {
            var v = this.findVariable(name);
            if(!v) {
                throw new Error("Variable was not declared in this scope: " + name);
            }
            if(v.initialized) {
                if (v.expression.getType() !== exp.getType())
                    throw new Error("Variable may not change it's type: " + name);
            } else {
                v.expression = exp;
                v.initialized = true;
            }

        },

        registerObject: function(name, obj) {
            this.variables[name] = obj;
        },

        findObject : function(name) {
            return this.findVariable(name);
        }


    });


    ns.Context = Context;



}(exports));

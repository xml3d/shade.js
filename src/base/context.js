(function (module) {

    var Context = function (root, opt) {

        opt = opt || {};

        /**
         * The root of the program to analyze
         * @type {*}
         */
        this.root = root;

        /**
         * To identify the main method of the shader
         * @type {*|string}
         */
        this.mainFunction = opt.mainFunction || "global.shade";


        /**
         * @type {Array.<Scope>}
         */
        this.scopeStack = opt.scope ? [opt.scope] : [  ];

    };

    Context.prototype = {
        getScope: function () {
            return this.scopeStack[this.scopeStack.length - 1];
        },
        pushScope: function (scope) {
            return this.scopeStack.push(scope);
        },
        popScope: function () {
            return this.scopeStack.pop();
        },
        inMainFunction: function() {
            return this.getScope().str() == this.mainFunction;
        }
    };


    module.exports = Context;

}(module));

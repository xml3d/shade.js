(function (module) {

    var Context = function (root, opt) {

        opt = opt || {};

        /**
         * The root of the program to analyze
         * @type {*}
         */
        this.root = root;

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
        }

    };


    module.exports = Context;

}(module));

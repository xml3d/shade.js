(function (ns) {

    var common = require("../base/common.js");
    var Scope = require("../base/scope.js");

    /**
     *
     * @param ast
     * @param {Function} analysis
     * @param {*} opt
     * @constructor
     */
    var AnalysisContext = function (ast, analysis, opt) {
        opt = opt || {};

        /**
         * Callback that continues analysis in the same context
         * @see {AnalysisContext.analyze}
         * @type {Function}
         */
        this.analysis = analysis;

        /**
         * @type {Array.<Scope>}
         */
        this.scopeStack = opt.scope ? [opt.scope] : [ new Scope(ast) ];

        // We monitor if we are in a declaration, otherwise we can't decide between
        // multiple declaration
        var inDeclaration = false;
        this.inDeclaration = function() {
            return inDeclaration;
        };

        this.setInDeclaration = function(v) {
            inDeclaration = v;
        }


    };

    AnalysisContext.prototype = {
        getTypeInfo: function (node) {
            return common.getTypeInfo(node, this.getScope());
        },
        analyze: function (node) {
            if (this.analysis) {
                this.analysis.apply(this, arguments);
            }
        },
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

    // TODO: remove
    AnalysisContext.prototype.traverse = AnalysisContext.prototype.analyze;

    ns.AnalysisContext = AnalysisContext;

}(exports));

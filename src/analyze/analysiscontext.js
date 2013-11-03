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
         * @type {Scope}
         */
        this.scope = opt.scope || new Scope(ast);

        var inDeclaration = false;
        this.inDeclaration = function() {
            return inDeclaration;
        }
        this.setInDeclaration = function(v) {
            inDeclaration = v;
        }


    };

    AnalysisContext.prototype = {
        getTypeInfo: function (node) {
            return common.getTypeInfo(node, this.scope);
        },
        analyze: function (node) {
            if (this.analysis) {
                this.analysis.apply(this, arguments);
            }
        },
        getScope: function () {
            return this.scope;
        },
    }

    // TODO: remove
    AnalysisContext.prototype.traverse = AnalysisContext.prototype.analyze;

    ns.AnalysisContext = AnalysisContext;

}(exports));

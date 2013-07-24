(function (ns) {
    var parser = require('esprima'),
        parameters = require("./analyze/parameters.js"),
        interfaces = require("./interfaces.js").Shade,
        inference = require("./analyze/typeinference/typeinference.js"),
        Base = require("./base/index.js").Base;



    Base.extend(ns, {

        /**
         * Analyzes a javascript program and returns a list of parameters
         * @param {function()|string) func
         * @returns {object!}
         */
        extractParameters: function (func) {
            if (typeof func == 'function') {
                func = func.toString();
            }
            var ast = parser.parse(func);

            return parameters.extractParameters(ast);
        },

        parseAndInferenceExpression: function (str, ctx) {
            var ast = parser.parse(str, {raw: true});
            var aast = inference.infer(ast, ctx);
            return aast;
        },

        TYPES : interfaces.TYPES

});
    /**
     * Library version:
     */
    ns.version = '0.0.1';

}(exports));

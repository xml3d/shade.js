(function (ns) {

    var Base = require("../../base/index.js").Base;

    /**
     * Generates GLSL code from and annotated AST
     * @constructor
     */
    var GLSLGenerator = function () {

    };

    Base.extend(GLSLGenerator.prototype, {

        /**
         *
         * @param {Object} aast The annotated AST
         * @returns {string}
         */
        generateFragmentShader: function (aast) {
            return "";
        }

    })

    ns.GLSLGenerator = GLSLGenerator;

}(exports));
var parser = require('esprima'),
    parameters = require("./analyze/parameters.js");

/**
 * Analyzes a javascript program and returns a list of parameters
 * @param {function()|string) func
 * @returns {object!}
 */
exports.extractParameters = function (func) {
    if (typeof func == 'function') {
        func = func.toString();
    }
    var ast = parser.parse(func);

    return parameters.extractParameters(ast);
};

/**
 * Library version:
 */
exports.version = '0.0.1';

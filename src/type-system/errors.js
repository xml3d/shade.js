// Dependencies
var codegen = require('escodegen');

var ErrorHandler = {};

/**
 * @param node
 * @param {string} type
 * @param {...*} message
 * @returns {{message: string, loc: *}}
 */
ErrorHandler.generateErrorInformation = function (node, type, message) {
    var args = Array.prototype.slice.call(arguments).splice(2),
        loc = node.loc,
        codeInfo = "";

    codeInfo += codegen.generate(node);
    if (loc && loc.start.line) {
        codeInfo += " (Line " + loc.start.line + ")";
    }
    message = args.length ? args.join(" ") + ": " : "";
    return {message: type + ": " + message + codeInfo, loc: loc};
};

ErrorHandler.ERROR_TYPES = {
    TYPE_ERROR: "TypeError",
    REFERENCE_ERROR: "ReferenceError",
    NAN_ERROR: "NotANumberError",
    SHADEJS_ERROR: "ShadeJSError"
};

module.exports = ErrorHandler;


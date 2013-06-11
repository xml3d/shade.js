(function (ns) {


    var findFunctionDeclarationInAST = function (name, ast) {
        return {};
    };

    var analyzeParameterForFunction = function (functionDeclaration, ast) {
        return { };
    };

    /**
     * @param {object!} ast
     * @param {object} opt
     */
    var extractParameters = function (ast, opt) {
        opt = opt || {};
        opt.startFunction = opt.startFunction || "shade";

        var func = findFunctionDeclarationInAST(opt.startFunction, ast);
        if (!func)
            throw new Error("No entry point found: " + opt.startFunction);

        return analyzeParameterForFunction(func, ast);
    };

    ns.extractParameters = extractParameters;

}(exports));
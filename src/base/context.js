var Context = function (root, opt) {

    this.options = opt || {};

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
    this.scopeStack = opt.scope ? [opt.scope] : [];

    /**
     * Reserved keywords
     * @type {Array.<string>}
     */
    this.blockedNames = opt.blockedNames || [];

    /**
     * Used names
     * @type {Array.<string>}
     */
    this.usedNames = [];


    this.declaration = false;
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
    inMainFunction: function () {
        return this.getScope().str() == this.mainFunction;
    },
    setInDeclaration: function (inDeclaration) {
        this.declaration = inDeclaration;
    },
    inDeclaration: function () {
        return this.declaration;
    },
    getSafeName: function (baseName) {
        var index = 0, searchName = baseName;
        while (this.blockedNames.indexOf(searchName) != -1) {
            searchName = baseName + index++;
        }
        return searchName;
    },
    getSafeUniqueName: function (baseName) {
        var index = 1, searchName = baseName;
        while (!(this.usedNames.indexOf(searchName) == -1 && this.blockedNames.indexOf(searchName) == -1)) {
            searchName = baseName + index++;
        }
        this.usedNames.push(searchName);
        return searchName;
    }

};


module.exports = Context;


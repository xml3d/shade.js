(function (ns) {

   var Tools = require("../tools.js"),
       Context = require("../../base/context.js");


   var TransformContext = function (root, opt) {
        Context.call(this, root, opt);

        this.usedParameters = {};
        this.variableNameMap = {};
        this.blockedNames = opt.blockedNames || [];
    };
    Tools.createClass(TransformContext, Context, {
        addUsedParameter: function (name, typeInfo) {
            this.usedParameters[name] = typeInfo;
        },
        getSafeName: function(baseName) {
            var index = 0, searchName = baseName;
            while (this.blockedNames.indexOf(searchName) != -1) {
                searchName = baseName + index++;
            }
            return searchName;
        },
        getVariableName: function(name) {
            if(this.variableNameMap.hasOwnProperty(name)) {
                return this.variableNameMap[name];
            }
            return null;
        },
        setVariableName: function(oldName, newName) {
            console.log("Set", oldName, newName);

            this.variableNameMap[oldName] = newName;
        }
    });

    exports.TransformContext = TransformContext;


}(exports));

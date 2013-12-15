(function (ns) {

   var Tools = require("../tools.js"),
       Context = require("../../base/context.js");


   var TransformContext = function (root, entry, opt) {
        Context.call(this, root, opt);
        this.usedParameters = {};
    };
    Tools.createClass(TransformContext, Context, {
        addUsedParameter: function (name, typeInfo) {
            this.usedParameters[name] = typeInfo;
        }
    });

    exports.TransformContext = TransformContext;


}(exports));

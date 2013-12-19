(function (ns) {

    var Closures = require("./xml3d-deferred.js"),
        Traversal = require('estraverse'),
        Syntax = Traversal.Syntax,
        parser = require('esprima'),
        Shade = require("../../interfaces.js"),
        ANNO = require("./../../base/annotation.js").ANNO,
        sanitizer = require("./../../analyze/sanitizer/sanitizer.js"),
        ColorClosureSignature = require("./color-closure-signature.js").ColorClosureSignature;


    ns.resolvePreTypeInference = function (aast, processData, opt) {
        var state = {
            colorClosureSignatures: [],
            inMain: false
        };
        var globalScrope = aast.scope;
        aast = Traversal.replace(aast, {
            enter: function(node, parent){
                switch(node.type){
                    case Syntax.FunctionDeclaration:
                        // TODO: Properly determine if we are in main function
                        if(node.id.name == "shade")
                            state.inMain = true;
                        else
                            this.skip();
                        break;
                }
            },
            leave: function(node, parent){
                switch(node.type){
                    case Syntax.FunctionDeclaration:
                        // TODO: Properly determine if we are in main function
                        if(node.id.name == "shade")
                            state.inMain = false;
                        break;
                    case Syntax.ReturnStatement:
                        if(state.inMain){
                            var signature = new ColorClosureSignature();
                            var replacement = signature.construct(node, globalScrope);
                            state.colorClosureSignatures.push(signature);
                            return replacement;
                        }
                }
            }
        })

        processData['colorClosureSignatures'] = state.colorClosureSignatures;

        return aast;
    }

}(exports));

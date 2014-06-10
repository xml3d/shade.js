(function (ns) {

    var walk = require('estraverse'),
        assert = require("assert"),
        Base = require("../../base/index.js"),
        common = require("./../../base/common.js"),
        Shade = require("../../interfaces.js"),
        TypeInfo = require("../../base/typeinfo.js").TypeInfo,
        StatementSplitTraverser = require("../../analyze/sanitizer/statement-split-traverser"),
        Types = Shade.TYPES,
        Kinds = Shade.OBJECT_KINDS,
        ANNO = require("../../base/annotation.js").ANNO;

    var Syntax = walk.Syntax;
    var VisitorOption = walk.VisitorOption;

    var SnippetList = function(){
        this.entries = [];
    }

    Base.extend(SnippetList.prototype, {
        addEntry: function(entry){
            this.entries.push(entry);
        }
    });

    var SnippetEntry = function(method){
        this.inputInfo = [];
        this.outputInfo = [];
        if(typeof(method) == "function"){
            method = method.toString();
        }
        var fullAst = Shade.getSanitizedAst(method, {});
        this.ast = fullAst.body[0];
    }

    Base.extend(SnippetEntry.prototype, {
        addDirectInput: function(type, arrayAccess, directInputIndex){
            var input = new SnippetInput(type, arrayAccess);
            input.setDirectInput(directInputIndex);
            this.inputInfo.push(input);
        },
        addTransferInput: function(type, arrayAccess, transferOperatorIndex, transferOutputIndex){
            var input = new SnippetInput(type, arrayAccess);
            input.setTransferInput(transferOperatorIndex, transferOutputIndex);
            this.inputInfo.push(input);
        }
    });


    var SnippetInput = function(type, iterate, arrayAccess){
        this.type = type;
        this.iterate = iterate;
        this.arrayAccess = arrayAccess;
        this.transferOperatorIndex = undefined;
        this.transferOutputIndex = undefined;
        this.directInputIndex = undefined;
    }

    Base.extend(SnippetInput.prototype, {
        setDirectInput: function(directInputIndex){
            this.transferOperatorIndex = this.transferOutputIndex = undefined;
            this.directInputIndex = directInputIndex;
        },
        setTransferInput: function(transferOperatorIndex, transferOutputIndex){
            this.transferOperatorIndex = transferOperatorIndex;
            this.transferOutputIndex = transferOutputIndex;
            this.directInputIndex = undefined;
        },
        isTransferInput: function(){
            return this.transferOperatorIndex !== undefined;
        },
        getTransferInputKey: function(){
            return this.transferOperatorIndex + "_" + this.transferOutputIndex;
        }
    });

    var SnippetOutput = function(type, name, transfered) {
        this.type = type;
        this.name = name;
        this.transfered = transfered;
        this.finalOutputIndex = undefined;
        this.lostOutputIndex = undefined;
    }

    Base.extend(SnippetOutput.prototype, {
        setFinalOutputIndex: function(index){
            this.finalOutputIndex = index;
            this.lostOutputIndex = undefined;
        },
        setLostOutputIndex: function(index){
            this.finalOutputIndex = undefined;
            this.lostOutputIndex = index;
        },
        isFinal: function(){
            return this.finalOutputIndex !== undefined;
        }
    });

    ns.SnippetList = SnippetList;

}(exports));

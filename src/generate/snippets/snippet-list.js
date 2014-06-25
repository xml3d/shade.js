(function (ns) {

    var walk = require('estraverse'),
        assert = require("assert"),
        Base = require("../../base/index.js"),
        common = require("./../../base/common.js");

    var SnippetList = function(){
        this.entries = [];
    }

    Base.extend(SnippetList.prototype, {
        addEntry: function(entry){
            this.entries.push(entry);
        }
    });

    var SnippetEntry = function(ast){
        this.inputInfo = [];
        this.outputInfo = [];
        this.ast = ast || null;
    }

    Base.extend(SnippetEntry.prototype, {
        setAst: function(ast){
            this.ast = ast;
        },
        addDirectInput: function(type, iterate, arrayAccess, directInputIndex){
            var input = new SnippetInput(type, iterate, arrayAccess);
            input.setDirectInput(directInputIndex);
            this.inputInfo.push(input);
        },
        addTransferInput: function(type, arrayAccess, transferOperatorIndex, transferOutputIndex){
            var input = new SnippetInput(type, true, arrayAccess);
            input.setTransferInput(transferOperatorIndex, transferOutputIndex);
            this.inputInfo.push(input);
        },
        addLostOutput: function(type, name){
            var output = new SnippetOutput(type, name);
            this.outputInfo.push(output);
        },
        addFinalOutput: function(type, name, index){
            var output = new SnippetOutput(type, name);
            output.setFinalOutputIndex(index);
            this.outputInfo.push(output);
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

    var SnippetOutput = function(type, name) {
        this.type = type;
        this.name = name;
        this.finalOutputIndex = undefined;
    }

    Base.extend(SnippetOutput.prototype, {
        setFinalOutputIndex: function(index){
            this.finalOutputIndex = index;
        },
        isFinal: function(){
            return this.finalOutputIndex !== undefined;
        }
    });

    ns.SnippetList = SnippetList;
    ns.SnippetEntry = SnippetEntry;

}(exports));

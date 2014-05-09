(function (ns) {

    var walk = require('estraverse'),
        assert = require("assert"),
        Base = require("../../base/index.js"),
        common = require("./../../base/common.js"),
        Shade = require("../../interfaces.js"),
        TypeInfo = require("../../base/typeinfo.js").TypeInfo,
        StatementSplitTraverser = require("../../analyze/sanitizer/statement-split-traverser");
        Types = Shade.TYPES,
        Kinds = Shade.OBJECT_KINDS;

    var Syntax = walk.Syntax;
    var VisitorOption = walk.VisitorOption;


    var SingleAssignmentSplitter = function(){
        StatementSplitTraverser.call(this);
    }

    Base.createClass(SingleAssignmentSplitter, StatementSplitTraverser, {
        statementSplitEnter: function(node, parent){
            switch(node.type){
                case Syntax.FunctionExpression:
                    return VisitorOption.Skip;
                case Syntax.Identifier:
                    return this.identifierEnter(node, parent);
                case Syntax.AssignmentExpression:
                case Syntax.UpdateExpression:
                    return this.assignmentEnter(node, parent);
            }
        },

        statementSplitExit: function (node, parent) {
            switch(node.type){
                case Syntax.AssignmentExpression:
                case Syntax.UpdateExpression:
                    return this.assignmentExit(node, parent);
                    break;
            }
        },

        identifierEnter: function(node, parent){
            if(parent.type == Syntax.MemberExpression)
                return;
            if(parent.type == Syntax.AssignmentExpression && parent.left == node)
                return;
            var name = node.name;
            if(!this.statementIdentifierInfo[name])
                this.statementIdentifierInfo[name] = { reads: [], lastWrite: null };
            this.statementIdentifierInfo[name].reads.push(node);
        },

        assignmentEnter: function(node, parent){
            if(parent.type == Syntax.ExpressionStatement)
                return;
            if((node.left || node.argument).type != Syntax.Identifier)
                throw Shade.throwError(node, "We only support nested assignments for simple identifiers, not objects or arrays.");

            if(node.type == Syntax.UpdateExpression){
                var usePrevValue = !node.prefix;
                node = { type: Syntax.AssignmentExpression,
                        operator: "=",
                        left: {type: Syntax.Identifier, name: node.argument.name, loc: node.argument.loc},
                        right: { type: Syntax.BinaryExpression,
                                 operator: node.operator == "++" ? "+" : "-",
                                 left:  {type: Syntax.Identifier, name: node.argument.name , loc: node.argument.loc},
                                 right: {type: Syntax.Literal, value: 1}
                        },
                        loc: node.loc,
                        _usePrevValue: usePrevValue
                };

            }
            else if(node.type == Syntax.AssignmentExpression && node.operator != "="){
                var binaryOperator = node.operator.substr(0, node.operator.length-1);
                node.operator = "=";
                node.right = { type: Syntax.BinaryExpression,
                               operator: binaryOperator,
                               left: {type: Syntax.Identifier, name: node.left.name, loc: node.right.loc },
                               right: node.right,
                               loc: node.right.loc};
            }
            var name = node.left.name;
            var entry = this.statementIdentifierInfo[name];
            if(entry && entry.reads.length > 0)
                node._preIdentifierWriter = entry.lastWrite;
            return node;
        },

        assignmentExit: function(node, parent){
            if(parent.type == Syntax.ExpressionStatement)
                return;

            var readOldValue = node._usePrevValue;
            delete node._usePrevValue;

            var oldName = node.left.name;
            if(!this.statementIdentifierInfo[oldName]){
                this.statementIdentifierInfo[oldName] = { reads: [], lastWrite: null };
            }

            var entry = this.statementIdentifierInfo[oldName];

            var readReplace = {
                type: Syntax.Identifier,
                name: oldName,
                loc: node.loc
            };
            if(readOldValue || (node._preIdentifierWriter !== undefined && node._preIdentifierWriter == entry.lastWrite)){
                var newName = this.getFreeName();
                if(!entry.lastWrite){
                    var copyAssignment = {
                        type: Syntax.AssignmentExpression,
                        left: { type: Syntax.Identifier, name: newName },
                        right: {type: Syntax.Identifier, name: oldName},
                        operator: "="
                    };
                    this.assignmentsToBePrepended.unshift(copyAssignment);
                }else{
                    entry.lastWrite.left.name = newName;
                }
                for(var i = 0; i < entry.reads.length; ++i){
                    entry.reads[i].name = newName;
                }
            }
            entry.reads = [];
            delete node._preIdentifierWriter;
            entry.lastWrite = node;

            if(readOldValue)
                readReplace.name = newName;
            else
                this.statementIdentifierInfo[oldName].reads.push(readReplace);


            this.assignmentsToBePrepended.push(node);
            return readReplace;
        }

    });

}(exports));

(function (ns) {

    var walk = require('estraverse'),
        assert = require("assert"),
        Base = require("../../base/index.js"),
        common = require("./../../base/common.js"),
        Shade = require("../../interfaces.js"),
        StatementSplitTraverser = require("./statement-split-traverser");

    var Syntax = walk.Syntax;
    var VisitorOption = walk.VisitorOption;


    var DeclarationSimplifier = function (opt) {
        this.declarationStack = [];
    };
    Base.extend(DeclarationSimplifier.prototype, {

        execute: function (root) {
            walk.replace(root, {
                enter: this.enterNode.bind(this),
                leave: this.exitNode.bind(this)
            });
            return root;
        },

        enterNode: function (node, parent) {
            switch(node.type){
                case Syntax.FunctionExpression:
                case Syntax.FunctionDeclaration:
                case Syntax.Program:
                    this.declarationStack.push([]);
                    break;
                case Syntax.VariableDeclarator:
                    this.addDeclaredIdentifier(node.id.name);
                    break;
            }
        },

        exitNode: function (node, parent) {
            switch(node.type){
                case Syntax.FunctionExpression:
                case Syntax.FunctionDeclaration:
                case Syntax.Program:
                    return this.addTopDeclaration(node, parent);
                    break;
                case Syntax.VariableDeclaration:
                    return this.removeMidCodeDeclaration(node, parent);
            }
        },

        removeMidCodeDeclaration: function(node, parent){
            var newNode;
            var isForInit = (parent.type == Syntax.ForStatement && parent.init == node);
            if(isForInit){
                newNode = {
                    type: Syntax.SequenceExpression,
                    expressions: [],
                    loc: node.loc
                }
            }
            else{
                newNode = {
                    type: Syntax.BlockStatement,
                    body: [],
                    loc: node.loc
                }
            }

            var declarations = node.declarations;
            for(var i = 0; i < declarations.length; ++i){
                var declaration = declarations[i];
                if(declaration.init){
                    var expression = {
                        type: Syntax.AssignmentExpression,
                        operator: "=",
                        left: declaration.id,
                        right: declaration.init,
                        loc: declaration.loc
                    };
                    if(isForInit)
                        newNode.expressions.push(expression);
                    else{
                        var statement = {
                            type: Syntax.ExpressionStatement,
                            expression: expression,
                            loc: declaration.loc
                        }
                        newNode.body.push(statement);
                    }
                }
            }
            if(isForInit && newNode.expressions.length == 1){
                return newNode.expressions[0];
            }
            return newNode;
        },

        addTopDeclaration: function(node, parent){
            var declarations = this.declarationStack.pop();
            if(declarations.length > 0){
                var declarationStatement = {
                    type: Syntax.VariableDeclaration,
                    declarations: [],
                    kind: "var"
                };
                for(var i = 0; i < declarations.length; ++i){
                    declarationStatement.declarations[i] = {
                        type: Syntax.VariableDeclarator,
                        id: { type: Syntax.Identifier, name: declarations[i] },
                        init: null
                    }
                }
                if(node.type == Syntax.Program)
                    node.body.unshift(declarationStatement);
                else if(node.body.body)
                    node.body.body.unshift(declarationStatement);
            }
            return node;
        },

        addDeclaredIdentifier: function(name){
            var topStack = this.declarationStack[this.declarationStack.length - 1];
            if(topStack.indexOf(name) == -1)
                topStack.push(name);
        }
    });
    var StatementSimplifier = function (opt) {
        StatementSplitTraverser.call(this, opt);
        this.skipExtraction.forInitUpdate = true;

        this.statementIdentifierInfo = {};
    };

    Base.createClass(StatementSimplifier, StatementSplitTraverser, {
        onGatherSplitInfo: function(){
            this.statementIdentifierInfo = {};
        },
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


    ns.sanitize = function (ast, opt) {
        var declarationSimplifier = new DeclarationSimplifier(opt);
        var statementSimplifier = new StatementSimplifier(opt);
        ast = declarationSimplifier.execute(ast);
        ast = statementSimplifier.execute(ast);
        return ast;
    };


}(exports));

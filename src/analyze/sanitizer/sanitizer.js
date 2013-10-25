(function (ns) {
    /**
     * Shade.js specific type inference that is also inferring
     * virtual types {@link Shade.TYPES }
     */

    var walk = require('estraverse'),
        assert = require("assert"),
        Base = require("../../base/index.js"),
        common = require("./../../base/common.js"),
        Shade = require("../../interfaces.js");

    var Syntax = walk.Syntax;


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
            var newNode = {
                type: Syntax.BlockStatement,
                body: [],
                loc: node.loc
            };
            var declarations = node.declarations;
            for(var i = 0; i < declarations.length; ++i){
                var declaration = declarations[i];
                if(declaration.init){
                    var statement = {
                        type: Syntax.ExpressionStatement,
                        expression: {
                            type: Syntax.AssignmentExpression,
                            operator: "=",
                            left: declaration.id,
                            right: declaration.init,
                            loc: declaration.loc
                        },
                        loc: declaration.loc
                    }
                    newNode.body.push(statement);
                }
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
        opt = opt || {};

        /**
         * The root of the program AST
         * @type {*}
         */
        this.statementIdentifierInfo = {};
        this.scopes = [];
        this.currentScopeTmpDeclared = [];
        this.currentStatementTmpUsed = [];
        this.assignmentsToBePrepended = [];
    };

    Base.extend(StatementSimplifier.prototype, {

        execute: function (root) {
            walk.replace(root, {
                enter: this.enterNode.bind(this),
                leave: this.exitNode.bind(this)
            });
            return root;
        },

        pushScope: function(){
            var newScope = {
                declared: [],
                tmpDeclared: []
            };
            this.scopes.push(newScope);
            return newScope;
        },
        popScope: function(){
            return this.scopes.pop();
        },
        getScope: function(){
            return this.scopes[this.scopes.length - 1];
        },

        enterNode: function (node, parent) {
            switch(node.type){
                case Syntax.FunctionExpression:
                case Syntax.FunctionDeclaration:
                case Syntax.Program:
                    var newScope= this.pushScope();
                    if(node.params){
                        for(var i = 0; i < node.params.length; ++i){
                            newScope.declared.push(node.params[i].name);
                        }
                    }
                    break;
                case Syntax.VariableDeclarator:
                    this.addDeclaredIdentifier(node.id.name);
                    break;
                case Syntax.Identifier:
                    return this.identifierEnter(node, parent);
                case Syntax.ExpressionStatement:
                    return this.expressionStatementEnter(node);
                case Syntax.AssignmentExpression:
                case Syntax.UpdateExpression:
                    return this.assignmentEnter(node, parent);
            }
        },

        exitNode: function (node, parent) {
            switch(node.type){
                case Syntax.FunctionExpression:
                case Syntax.FunctionDeclaration:
                    return this.addTmpDeclaration(node);
                case Syntax.Program:
                    this.removeRedundantBlocks(node, "body");
                    return this.addTmpDeclaration(node);
                case Syntax.ExpressionStatement:
                    return this.expressionStatementExit(node);
                    break;
                case Syntax.AssignmentExpression:
                case Syntax.UpdateExpression:
                    return this.assignmentExit(node, parent);
                    break;
                case Syntax.BlockStatement:
                    return this.removeRedundantBlocks(node, "body");
                case Syntax.SwitchCase:
                    return this.removeRedundantBlocks(node, "consequent");
            }
        },

        addDeclaredIdentifier: function(name){
            var declared = this.getScope().declared;
            if(declared.indexOf(name) == -1)
                declared.push(name);
        },

        isNameDeclared: function(name){
            var i = this.scopes.length;
            while(i--){
                if(this.scopes[i].declared.indexOf(name) != -1)
                    return true;
            }
            if(this.getScope().tmpDeclared.indexOf(name) != -1)
                return true;
            return false;
        },

        getFreeName: function(){
            var resultIdx = 0;
            var result;
            do{
                result = "_tmp" + resultIdx++;
            }while(this.isNameDeclared(result) || this.currentStatementTmpUsed.indexOf(result) != -1);
            this.currentStatementTmpUsed.push(result);
            var scope = this.getScope();
            if(scope.tmpDeclared.indexOf(result) == -1)
                scope.tmpDeclared.push(result);
            return result;
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
                return node;
            };
            if(node.type == Syntax.AssignmentExpression && node.operator != "="){
                var binaryOperator = node.operator.substr(0, node.operator.length-1);
                node.operator = "=";
                node.right = { type: Syntax.BinaryExpression,
                               operator: binaryOperator,
                               left: {type: Syntax.Identifier, name: node.left.name, loc: node.right.loc },
                               right: node.right,
                               loc: node.right.loc};
                return node;
            }
        },

        assignmentExit: function(node, parent){
            if(parent.type == Syntax.ExpressionStatement)
                return;

            var readOldValue = node._usePrevValue;
            delete node._usePrevValue;

            var oldName = node.left.name,
                entry = this.statementIdentifierInfo[oldName];
            var readReplace = {
                type: Syntax.Identifier,
                name: oldName,
                loc: node.loc
            };
            if(entry){
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
                entry.reads = [];
                entry.lastWrite = node;
            }
            else{
                this.statementIdentifierInfo[oldName] = { reads: [], lastWrite: node }
            }
            if(readOldValue)
                readReplace.name = newName;
            else
                this.statementIdentifierInfo[oldName].reads.push(readReplace);

            this.assignmentsToBePrepended.push(node);
            return readReplace;
        },

        expressionStatementEnter: function(node){
            this.statementIdentifierInfo = {};
        },

        expressionStatementExit: function(node){
            var result = node;
            if(this.assignmentsToBePrepended.length > 0){
                result = {
                    type: Syntax.BlockStatement,
                    body: [],
                    loc: node.loc
                };
                for(var i = 0; i < this.assignmentsToBePrepended.length; ++i){
                    var assignment = this.assignmentsToBePrepended[i];
                    result.body.push({
                       type: Syntax.ExpressionStatement,
                       expression: assignment,
                       loc: assignment.loc
                    });
                }
                result.body.push(node);
            }
            this.currentStatementTmpUsed = [];
            this.assignmentsToBePrepended = [];
            this.statementIdentifierInfo = {};
            return result;
        },

        removeRedundantBlocks: function(node, propertyName){
            var list = node[propertyName];
            var i = list.length;
            while(i--){
                if(list[i].type == Syntax.BlockStatement){
                    var args = [i, 1];
                    args.push.apply(args, list[i].body);
                    list.splice.apply(list, args);
                }
            }
            return node;
        },

        addTmpDeclaration: function(node){
            var tmpDeclared = this.getScope().tmpDeclared;
            if(tmpDeclared.length == 0)
                return;
            var list;
            if(node.type == Syntax.Program)
                list = node.body;
            else
                list = node.body.body;
            var declaration = null;
            if(list[0].type == Syntax.VariableDeclaration)
                declaration = list[0];
            else{
                declaration = {
                    type: Syntax.VariableDeclaration,
                    declarations: [],
                    kind: "var"
                };
                list.unshift(declaration);
            }
            for(var i = 0; i < tmpDeclared.length; ++i)
                declaration.declarations.push ({
                    type : Syntax.VariableDeclarator,
                    id: { type: Syntax.Identifier, name: tmpDeclared[i] },
                    init: null
                });

            this.popScope();
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

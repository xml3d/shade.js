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
        this.preContinueStatements = [];
    };

    Base.extend(StatementSimplifier.prototype, {

        execute: function (root) {
            walk.replace(root, {
                enter: this.enterNode.bind(this),
                leave: this.exitNode.bind(this)
            });
            return root;
        },


        gatherStatmentSplitInfo: function(node){
            this.statementIdentifierInfo = {};
            this.currentStatementTmpUsed = [];
            this.assignmentsToBePrepended = [];
            return walk.replace(node, {
                enter: this.statementSplitEnter.bind(this),
                leave: this.statementSplitExit.bind(this)
            });
        },

        isRedundant: function(node){
            var result = true;
            walk.traverse(node, {
                enter: function(node){
                    switch(node.type){
                        case Syntax.AssignmentExpression:
                        case Syntax.UpdateExpression:
                        case Syntax.FunctionExpression:
                        case Syntax.FunctionDeclaration:
                        case Syntax.CallExpression:
                            result = false;
                            this.break();
                    }
                }
            });
            return result;
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
        addPreContinueStatements: function(statements){
            var last = this.preContinueStatements[this.preContinueStatements.length - 1];
            last.push.apply(last, statements);
        },
        getPreContinueStatements: function(){
            return this.preContinueStatements[this.preContinueStatements.length - 1];
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
                case Syntax.ContinueStatement:
                    return this.extendContinueStatement(node);
                case Syntax.ExpressionStatement:
                    return this.performStatementSplit(node, [{pre: true}]);
                case Syntax.IfStatement:
                    return this.performStatementSplit(node, [{prop: "test", pre: true}]);
                case Syntax.WhileStatement:
                    return this.performStatementSplit(node, [{prop: "test", pre: true, post: true}], "body");
                case Syntax.ForStatement:
                    return this.performStatementSplit(node, [ /*{prop: "init", pre: true, extract: true},
                                                             {prop: "update", post: true, extract: true},*/
                                                             {prop: "test", pre: true, post: true}], "body");
                case Syntax.DoWhileStatement:
                    return this.performStatementSplit(node, [{prop: "test", post: true}], "body");
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
                case Syntax.BlockStatement:
                    return this.removeRedundantBlocks(node, "body");
                case Syntax.SwitchCase:
                    return this.removeRedundantBlocks(node, "consequent");
                case Syntax.ContinueStatement:
                    delete node._extended;
                    break;
                case Syntax.WhileStatement:
                case Syntax.ForStatement:
                case Syntax.DoWhileStatement:
                    if(node._preContinueStacked){
                        delete node._preContinueStacked;
                        this.preContinueStatements.pop();
                    }
                    break;
            }
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
        },

        performStatementSplit: function(node, subProperties, bodyProperty){
            if(bodyProperty && !node._preContinueStacked){
                this.preContinueStatements.push([]);
                node._preContinueStacked = true;
            }

            var originalNode = node, returnNode = node;
            for(var i = 0; i < subProperties.length; ++i){
                var property = subProperties[i].prop;
                var target = originalNode;
                if(property) target = originalNode[property];
                if(property && subProperties[i].extract){
                    this.statementIdentifierInfo = {};
                    this.currentStatementTmpUsed = [];
                    this.assignmentsToBePrepended = target ? [target] : [];
                    originalNode[property] = null;
                }
                else{
                    target = this.gatherStatmentSplitInfo(target);
                    if(property)
                        originalNode[property] = target;
                    else
                        returnNode = target;
                }
                if(this.assignmentsToBePrepended.length > 0){
                    if(subProperties[i].pre){
                        returnNode = this.getSplittedStatementBlock(this.assignmentsToBePrepended, returnNode);
                    }
                    if(subProperties[i].post){
                        var body = originalNode[bodyProperty];
                        var statements = this.getSplittedStatementBlock(this.assignmentsToBePrepended);
                        if(body && body.type == Syntax.BlockStatement){

                            body.body.push(statements);
                        }
                        else{
                            if(body) statements.body.unshift(body);
                            originalNode[bodyProperty] = statements;
                        }
                        this.addPreContinueStatements(this.assignmentsToBePrepended);
                    }
                }
            }
            return returnNode;
        },

        extendContinueStatement: function(node){
            if(node._extended)
                return;
            node._extended = true;
            var statements = this.getPreContinueStatements();
            if(statements.length == 0 )
                return node;
            return this.getSplittedStatementBlock(statements,node);
        },

        getSplittedStatementBlock: function(statements, node){
            var result = {
                type: Syntax.BlockStatement,
                body: [],
                loc: node && node.loc
            };
            for(var i = 0; i < statements.length; ++i){
                var assignment = Base.deepExtend({}, statements[i]);
                result.body.push({
                   type: Syntax.ExpressionStatement,
                   expression: assignment,
                   loc: assignment.loc
                });
            }
            if(node && (node.type != Syntax.ExpressionStatement || !this.isRedundant(node))){
                result.body.push(node);
            }
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

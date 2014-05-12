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

    var FunctionArgWriteDuplicator = function (opt) {
        this.scopeStack = [];
    };
    Base.extend(FunctionArgWriteDuplicator.prototype, {

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
                    this.pushScope(node);
                    this.findArgAssignments(node.body);
                    break;
                case Syntax.Program:
                    this.pushScope(node);
                    break;
                case Syntax.VariableDeclarator:
                    this.addDeclaredIdentifier(node.id.name);
                    break;
            }
        },

        exitNode: function (node, parent) {
            switch(node.type){
                case Syntax.Identifier:
                    return this.resolveIdentifier(node, parent);
                case Syntax.FunctionExpression:
                case Syntax.FunctionDeclaration:
                case Syntax.Program:
                    return this.resolveScope(node, parent);
                    break;
            }
        },

        pushScope: function(node){
            var scope = { declared: [], args: {}};

            var params = node.params;
            if(params){
                for(var i = 0; i < params.length; ++i){
                    scope.args[params[i].name] = {name: params[i].name, replace: null, extra: Base.deepExtend({},params[i].extra)};
                    scope.declared.push(params[i].name);
                }
            }
            this.scopeStack.push(scope);
        },
        resolveScope: function(node, parent){
            var scope = this.scopeStack.pop();
            var toBeDeclared = [];
            for(var key in scope.args){
                if(scope.args[key].replace) toBeDeclared.push(scope.args[key]);
            }
            this.addTopDeclaration(node, toBeDeclared);
            return node;
        },
        getScope: function(){
            return this.scopeStack[this.scopeStack.length -1];
        },

        findArgAssignments: function(node){
            walk.traverse(node, {
                enter: this.assignmentSearchEnter.bind(this)
            });
        },
        assignmentSearchEnter: function(node, parent){
            switch(node.type){
                case Syntax.Program:
                case Syntax.FunctionDeclaration:
                case Syntax.FunctionExpression:
                    return VisitorOption.Skip;
            }
            if(node.type != Syntax.AssignmentExpression) return;
            if(node.left.type != Syntax.Identifier) return;
            if(ANNO(node).getType() != Types.OBJECT)
                return VisitorOption.Skip;
            var scope = this.getScope();
            var varName = node.left.name;
            if(scope.args[varName]){
                if(!scope.args[varName].replace){
                    var newVarName = this.getFreeVarName("_dest_" + varName);
                    this.addDeclaredIdentifier(newVarName);
                    scope.args[varName].replace = newVarName;
                }
            }
            return VisitorOption.Skip;
        },

        resolveIdentifier: function(node, parent){
            if(parent.type == Syntax.FunctionDeclaration || parent.type == Syntax.FunctionExpression) return;
            var scope = this.getScope();
            var arg = scope.args[node.name];
            if(arg && arg.replace)
                node.name = arg.replace;
            return node;
        },
        getFreeVarName: function(varName){
            var result = varName, i = 0;
            while(this.isVarDeclared(result)){
                i++;
                result = varName + i;
            }
            return result;
        },
        isVarDeclared: function(varName){
            var i = this.scopeStack.length;
            while(i--){
                if(this.scopeStack[i].declared.indexOf(varName) != -1) return true;
            }
            return false;
        },

        addTopDeclaration: function(node, declarations){
            if(declarations.length > 0){
                var declarators = [];
                var assignments = [];
                for(var i = 0; i < declarations.length; ++i){
                    var declaration = {
                        type: Syntax.VariableDeclarator,
                        id: { type: Syntax.Identifier, name: declarations[i].replace },
                        extra: declarations[i].extra,
                        init: null
                    }
                    var assignment = {
                        type: Syntax.ExpressionStatement,
                        expression: { type: Syntax.AssignmentExpression,
                            operator: "=",
                            left: { type: Syntax.Identifier, name: declarations[i].replace},
                            right: { type: Syntax.Identifier, name: declarations[i].name}
                        }
                    };
                    var annoDeclaration = ANNO(declaration);
                    ANNO(assignment.expression).copy(annoDeclaration);
                    ANNO(assignment.expression.left).copy(annoDeclaration);
                    ANNO(assignment.expression.right).copy(annoDeclaration);
                    declarators.push(declaration);
                    assignments.push(assignment);
                }

                var dest;
                if(node.type == Syntax.Program)
                    dest= node.body;
                else if(node.body.body)
                    dest= node.body.body;

                if(dest.length == 0 || dest[0].type != Syntax.VariableDeclaration){
                    dest.unshift({
                        type: Syntax.VariableDeclaration,
                        declarations: declarators,
                        kind: "var"
                    });
                }
                else
                    dest[0].declarations.push.apply(dest[0].declarations, declarators);

                var nonDeclarationIndex = 0;
                while(nonDeclarationIndex < dest.length && dest[nonDeclarationIndex].type == Syntax.VariableDeclaration){
                    nonDeclarationIndex++;
                }
                assignments.unshift(nonDeclarationIndex,0);
                dest.splice.apply(dest, assignments);
            }
            return node;
        },

        addDeclaredIdentifier: function(name){
            var topScope = this.getScope();
            if(topScope.declared.indexOf(name) == -1)
                topScope.declared.push(name);
        }
    });


    var SingleAssignmentSplitter = function(){
        StatementSplitTraverser.call(this);

    }

    Base.createClass(SingleAssignmentSplitter, StatementSplitTraverser, {


        statementSplitEnter: function(node, parent){
            switch(node.type){
                case Syntax.FunctionExpression:
                    return VisitorOption.Skip;
                case Syntax.CallExpression:
                    return this.callEnter(node, parent);
            }
        },

        statementSplitExit: function (node, parent) {
            switch(node.type){
                case Syntax.CallExpression:
                    return this.callExit(node, parent);
                    break;
            }
        },

        callEnter: function(node, parent){
            if(parent.type == Syntax.AssignmentExpression)
                return;

            var nodeAnno = ANNO(node);
            var type = nodeAnno.getType(), kind = nodeAnno.getKind();
            if(!this.isObjectResult(type, kind))
                return;

            node._usedIndex = this.getStatementTmpUsedCount();

        },

        callExit: function(node, parent){
            if(parent.type == Syntax.AssignmentExpression)
                return;
            if(node._usedIndex === undefined) return;
            this.reduceStatementTmpUsed(node._usedIndex);
            delete node._usedIndex;

            var nodeAnno = ANNO(node);
            var type = nodeAnno.getType(), kind = nodeAnno.getKind();
            var tmpName = this.getFreeName(type, kind);

            var assignment = {
                type: Syntax.AssignmentExpression,
                operator: "=",
                left: {type: Syntax.Identifier, name: tmpName},
                right: node
            };
            ANNO(assignment).copy(ANNO(node));
            ANNO(assignment.left).copy(ANNO(node));
            this.assignmentsToBePrepended.push(assignment);

            var identifierNode = {type: Syntax.Identifier, name: tmpName};
            ANNO(identifierNode).copy(ANNO(node));
            return identifierNode;
        },

        isObjectResult: function(type, kind){
            return type == Types.OBJECT;
        }
    });

    ns.simplifyStatements = function (aast, opt) {
        var funcArgWriteDuplicator = new FunctionArgWriteDuplicator(opt);
        aast = funcArgWriteDuplicator.execute(aast);

        var singleAssignmentSplitter = new SingleAssignmentSplitter(opt);
        aast = singleAssignmentSplitter.execute(aast);
        return aast;
    };

}(exports));

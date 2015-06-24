(function (ns) {

    var walk = require('estraverse'),
        assert = require("assert"),
        Base = require("../../base/index.js"),
        common = require("./../../base/common.js"),
        Shade = require("../../interfaces.js"),
        TypeInfo = require("../../type-system/typeinfo.js").TypeInfo,
        ANNO = require("../../base/annotation.js").ANNO,
        Types = Shade.TYPES,
        Kinds = Shade.OBJECT_KINDS;

    var Syntax = walk.Syntax;

    var StatementSplitTraverser = function (opt) {
        opt = opt || {};

        /**
         * The root of the program AST
         * @type {*}
         */
        this.scopes = [];
        this.preContinueStatements = [];
        this.currentStatementTmpUsed = [];
        this.assignmentsToBePrepended = [];

        this.skipExtraction = {
            forInitUpdate: false
        }
    };

    Base.extend(StatementSplitTraverser.prototype, {

        execute: function (root) {
            walk.replace(root, {
                enter: this.enterNode.bind(this),
                leave: this.exitNode.bind(this)
            });
            return root;
        },


        gatherStatmentSplitInfo: function(node){
            this.currentStatementTmpUsed = [];
            this.assignmentsToBePrepended = [];
            this.onGatherSplitInfo();
            return walk.replace(node, {
                enter: this.statementSplitEnter.bind(this),
                leave: this.statementSplitExit.bind(this)
            });
        },
        statementSplitEnter: function(nodeParent){
            // Implemented by subclass
        },
        statementSplitExit: function(nodeParent){
            // Implemented by subclass
        },
        onGatherSplitInfo: function(){
            // Implemented by subclass
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
                tmpDeclared: [],
                tmpDeclaredTypes: []
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
                case Syntax.ReturnStatement:
                    if(node.argument)
                        return this.performStatementSplit(node, [{prop: "argument", pre: true}]);
                    break;
                case Syntax.WhileStatement:
                    return this.performStatementSplit(node, [{prop: "test", pre: true, post: true}], "body");
                case Syntax.ForStatement:
                    var extractions = [];

                    if(!this.skipExtraction.forInitUpdate)
                        extractions.push({prop: "init", pre: true, extract: true});

                    extractions.push({prop: "test", pre: true, post: true});

                    if(!this.skipExtraction.forInitUpdate)
                        extractions.push({prop: "update", post: true, extract: true});

                    return this.performStatementSplit(node, extractions, "body");
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


        addDeclaredIdentifier: function(name){
            var declared = this.getScope().declared;
            if(declared.indexOf(name) == -1)
                declared.push(name);
        },

        isNameDeclared: function(name, untyped){
            var i = this.scopes.length;
            while(i--){
                if(this.scopes[i].declared.indexOf(name) != -1)
                    return true;
            }
            if(untyped && this.getScope().tmpDeclared.indexOf(name) != -1)
                return true;
            return false;
        },

        getFreeName: function(type, kind){
            var resultIdx = 0;
            var untyped = (type === undefined);
            var result, prefix = this._getTypedPrefix(type, kind);
            do{
                result = prefix + resultIdx++;
            }while(this.isNameDeclared(result, untyped) || this.currentStatementTmpUsed.indexOf(result) != -1);
            this.currentStatementTmpUsed.push(result);
            var scope = this.getScope();
            if(scope.tmpDeclared.indexOf(result) == -1){
                scope.tmpDeclared.push(result);
                scope.tmpDeclaredTypes.push({type: type, kind: kind});
            }
            return result;
        },

        getStatementTmpUsedCount: function(){
            return this.currentStatementTmpUsed.length;
        },
        reduceStatementTmpUsed: function(newCount){
            this.currentStatementTmpUsed.length = newCount;
        },

        removeStatementTmpUsedAfter: function(name){
            var idx = this.currentStatementTmpUsed.indexOf(name);
            if(idx == -1) return;
            idx++;
            var removeCount = this.currentStatementTmpUsed.length - idx;
            this.currentStatementTmpUsed.splice(idx, removeCount );
        },


        _getTypedPrefix: function(type, kind){
            if(type === undefined)
                return "_tmp";
            switch(type){
                case Types.BOOLEAN: return "_boolTmp";
                case Types.NUMBER: return "_numTmp";
                case Types.INT: return "_intTmp";
                case Types.STRING: return "_stringTmp";
                case Types.OBJECT: switch(kind){
                    case Kinds.FLOAT2: return "_vec2Tmp";
                    case Kinds.FLOAT3: return "_vec3Tmp";
                    case Kinds.FLOAT4: return "_vec4Tmp";
                    case Kinds.MATRIX3: return "_mat3Tmp";
                    case Kinds.MATRIX4: return "_mat4Tmp";
                }
            }
        },

        performStatementSplit: function(node, subProperties, bodyProperty){
            if(bodyProperty && !node._preContinueStacked){
                this.preContinueStatements.push([]);
                node._preContinueStacked = true;
            }

            var originalNode = node, returnNode = node;
            var i = subProperties.length;
            while(i--){
                var property = subProperties[i].prop;
                var target = originalNode;
                if(property) target = originalNode[property];
                if(property && subProperties[i].extract){
                    this.onGatherSplitInfo();
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
            var tmpDeclared = this.getScope().tmpDeclared,
                tmpDeclaredTypes = this.getScope().tmpDeclaredTypes;
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
            for(var i = 0; i < tmpDeclared.length; ++i){
                var declarator = {
                    type : Syntax.VariableDeclarator,
                    id: { type: Syntax.Identifier, name: tmpDeclared[i] },
                    init: null
                };
                if(tmpDeclaredTypes[i].type !== undefined){
                    ANNO(declarator).setType(tmpDeclaredTypes[i].type, tmpDeclaredTypes[i].kind);
                }
                declaration.declarations.push(declarator);
            }


            this.popScope();
        }
    });

    module.exports = StatementSplitTraverser;

}(module));

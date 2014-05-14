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
                case Syntax.NewExpression:
                case Syntax.MemberExpression:
                    node._usedIndex = this.getStatementTmpUsedCount();
                    return;
            }
        },

        statementSplitExit: function (node, parent) {
            switch(node.type){
                case Syntax.CallExpression:
                case Syntax.NewExpression:
                    return this.callExit(node, parent);
                case Syntax.MemberExpression:
                    return this.memberExit(node, parent)
            }
        },

        memberExit: function(node, parent){
            var nodeAnno = ANNO(node);
            var type = nodeAnno.getType(), kind = nodeAnno.getKind();

            var usedIndex = node._usedIndex;
            delete node._usedIndex;

            if(parent.type == Syntax.AssignmentExpression)
                return;

            // Extract array access:
            if(node.computed && ANNO(node.object).getType() == Types.ARRAY && this.isObjectResult(type, kind)){
                this.reduceStatementTmpUsed(usedIndex);

                var identifierNode = this.addAssignment(type, kind, node);
                return identifierNode;
            }



        },

        callExit: function(node, parent){

            var nodeAnno = ANNO(node);
            var type = nodeAnno.getType(), kind = nodeAnno.getKind();

            var usedIndex = node._usedIndex;
            delete node._usedIndex;

            if(node.type == Syntax.CallExpression){
                var argumentInfo = this.getObjectArgsInfo(node);
                if(argumentInfo){
                    var argType = argumentInfo.type;
                    var argKind = argumentInfo.kind;

                    var newNode = {type: Syntax.NewExpression,
                        callee: {type: Syntax.Identifier, name: this.getCalleeName(argType, argKind)},
                        arguments: argumentInfo.args
                    };
                    ANNO(newNode).setType(argType, argKind);
                    var tmpArgIdentifier = this.addAssignment(argType, argKind, newNode);
                    node.arguments.splice(argumentInfo.argIndex, argumentInfo.args.length, tmpArgIdentifier);

                }
            }
            if(!this.isObjectResult(type, kind))
                return;

            if(parent.type == Syntax.AssignmentExpression)
                return;


            this.reduceStatementTmpUsed(usedIndex);

            var identifierNode = this.addAssignment(type, kind, node);
            return identifierNode;
        },

        addAssignment: function(type, kind, right){
            var tmpName = this.getFreeName(type, kind);

            var assignment = {
                type: Syntax.AssignmentExpression,
                operator: "=",
                left: {type: Syntax.Identifier, name: tmpName},
                right: right
            };
            ANNO(assignment).copy(ANNO(right));
            ANNO(assignment.left).copy(ANNO(right));
            this.assignmentsToBePrepended.push(assignment);

            var identifierNode = {type: Syntax.Identifier, name: tmpName};
            ANNO(identifierNode).copy(ANNO(right));
            return identifierNode;
        },

        isObjectResult: function(type, kind){
            return type == Types.OBJECT;
        },

        getCalleeName: function(type, kind){
            switch(kind){
                case Kinds.FLOAT2: return "Vec2";
                case Kinds.FLOAT3: return "Vec3";
                case Kinds.FLOAT4: return "Vec4";
                case Kinds.MATRIX3: return "Mat3";
                case Kinds.MATRIX4: return "Mat4";
            }
            throw new Error("Unknown Kind '" + kind + "', no callee available.");
        },
        getObjectArgsInfo: function(node){
            var result = {
                type: null,
                kind: null,
                argIndex: 0,
                args: null
            }
            if(!getNodeArgumentTypeAndIndex(node, result))
                return false;
            return result;

        }
    });

    function getNodeArgumentTypeAndIndex(node, result){
        if(node.callee.type != Syntax.MemberExpression)
            return false;
        var objectKind = ANNO(node.callee.object).getKind();
        if(objectKind == Kinds.ANY)
            return false;
        var objComponentCnt = getObjectComponentCount(objectKind);
        var requiredComponents = getArgTypeandIndex(objComponentCnt, node.callee.property.name, result);
        if(!requiredComponents)
            return false;
        var index = result.argIndex;
        var providedComponents = 0;
        var args = [];
        while(index < node.arguments.length && providedComponents < requiredComponents){
            var arg = node.arguments[index];
            args.push(arg);
            providedComponents += getObjectComponentCount(ANNO(arg).getKind());
            index++;
        }
        if(providedComponents == 0)
            return false;
        if(providedComponents == requiredComponents && args.length == 1)
            return false;
        result.args = args;
        return result;
    }

    function getObjectComponentCount(objectKind){
        switch(objectKind){
            case Kinds.FLOAT2: return 2;
            case Kinds.FLOAT3: return 3;
            case Kinds.FLOAT4: return 4;
            case Kinds.MATRIX3: return 9;
            case Kinds.MATRIX4: return 16;
            default: return 1; // must be number
        }
    }
    function getObjectKindByComponentCount(componentCount){
        switch(componentCount){
            case 2: return Kinds.FLOAT2;
            case 3: return Kinds.FLOAT3;
            case 4: return Kinds.FLOAT4;
            case 9: return Kinds.MATRIX3;
            case 16: return Kinds.MATRIX4;
        }
        throw new Error("Unknown Object Count '" + componentCount + "', no kind available.");
    }

    function getArgTypeandIndex(objComponentCnt, methodName, result){
        var inputComponentCnt = 0, offsetIndex = 0;
        switch(methodName){
            case 'add':
            case 'sub':
            case 'mul':
            case 'div':
            case 'mod':
            case 'reflect':
            case 'cross':
            case 'dot' :    inputComponentCnt = objComponentCnt;
                            break;
            case 'length' : inputComponentCnt = 1;
                            break;
            case 'normalize' :
            case 'flip' :
                            inputComponentCnt = 0;
                            break;
            case 'mulVec':  inputComponentCnt = (objComponentCnt == 16 ? 4 : 3);
                            break;
            case 'col':     inputComponentCnt = (objComponentCnt == 16 ? 4 : 3);
                            offsetIndex = 1;
                            break;
            default:
                var swizzleMatches = methodName.match(/^([xyzwrgbastpq]{1,4})(Add|Sub|Mul|Div)?$/);
                if(swizzleMatches){
                    inputComponentCnt = swizzleMatches[1].length;
                }
        };
        if(inputComponentCnt <= 1) return 0;
        result.type = Types.OBJECT;
        result.kind = getObjectKindByComponentCount(inputComponentCnt);
        result.argIndex = offsetIndex;
        return inputComponentCnt;
    }

    ns.simplifyStatements = function (aast, opt) {
        var funcArgWriteDuplicator = new FunctionArgWriteDuplicator(opt);
        aast = funcArgWriteDuplicator.execute(aast);

        var singleAssignmentSplitter = new SingleAssignmentSplitter(opt);
        aast = singleAssignmentSplitter.execute(aast);
        return aast;
    };

}(exports));

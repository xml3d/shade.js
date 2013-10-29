#!/usr/bin/env node

var argv = require('optimist').argv,
    usage = "node ./slice.js script.js [-p]";

var esprima = require('esprima');
var esgraph = require('esgraph');
var estraverse = require('estraverse');
var escodegen = require('escodegen');
var analyses = require('analyses');
var map = require('es6-map-shim');
var common = require("../src/base/common.js");

var fs = require('fs');

var slice = require("../src/analyze/slice.js")
var Set = analyses.Set;
var Syntax = common.Syntax;

function doAnalysis(cfg, startNode, variable) {
    var count = 1;
    cfg[2].forEach(function(n) {!n.type && (n.label = count++)});
    var output = slice(cfg, startNode, variable);
    output.add(cfg[1].prev[0]);
    return output;
}


(function (args) {

    var filename = args._[0];
    var variable = args._[1];


    if (!filename || !variable) {
        console.log(usage);
        process.exit(0);
    }

    var data = fs.readFileSync(filename, "utf-8");

    var start = Date.now();

    var ast = esprima.parse(data);

    var shadeFunction = ast.body.filter(function(node) { return node.type == Syntax.FunctionDeclaration && node.id.name == "shade"});

    if(!shadeFunction.length) {
        console.log("No shade function found");
        process.exit(0);
    }

    ast = shadeFunction[0];
    var cfg = esgraph(ast.body, { omitExceptions: true });

    var startNode = cfg[1].prev[0]; // Start at the node before the implicit end node for now
    var relevantStatements = doAnalysis(cfg, startNode,variable); // ~17ms

    var getCFGNode = function(cfg, ast) {
        for(var i = 0; i< cfg[2].length; i++) {
            if (!cfg[2][i].type && cfg[2][i].astNode == ast) {
                return cfg[2][i];
            }
        }
        return null;
    }

    ast = estraverse.replace(ast, {
        enter: function(node) {
            var cfgNode = null;

            if(node == startNode.astNode) {
                return {
                    type: Syntax.ReturnStatement,
                    argument: {
                        type:Syntax.Identifier,
                        name: variable
                    }
                }
            }

            if (node.type == estraverse.Syntax.ExpressionStatement) {
                cfgNode = getCFGNode(cfg, node.expression);
            }
            else if (node.type == estraverse.Syntax.IfStatement) {
                cfgNode = getCFGNode(cfg, node.test);
            } else {
                cfgNode = getCFGNode(cfg, node);
            }

            if (cfgNode) { // AST has a corresponding CFG node
                if (!relevantStatements.has(cfgNode)) {
                    return { type: estraverse.Syntax.EmptyStatement };
                }
            }

        }});

    console.log(escodegen.generate(ast));

    var duration = Date.now() - start;

    console.log(duration + " ms");



}(argv));

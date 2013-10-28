#!/usr/bin/env node

var argv = require('optimist').argv,
    usage = "node ./js2cfg.js script.js [-p]";


function findFunctions(ast) {
    var walkes = require('walkes');

    var functions = [];
    function handleFunction(recurse) {
        functions.push(this);
        recurse(this.body);
    }
    walkes(ast, {
        FunctionDeclaration: handleFunction,
        FunctionExpression: handleFunction
    });
    return functions;
}

(function (args) {
    var esgraph = require('esgraph'),
        esprima = require('esprima'),
        fs = require("fs"),
        slice = require("../src/analyze/slice.js")

    var filename = args._[0];


    if (!filename) {
        console.log(usage);
        process.exit(0);
    }

    var ast = (function () {

        var data = fs.readFileSync(filename, "utf-8");
        var source = data;
        // filter out hashbangs
        if (source.indexOf('#!') === 0) {
            source = '//' + source.substring(2);
        }

        try {
            var ast = esprima.parse(source, {range: true});
            var functions = findFunctions(ast);

            var result = 'digraph cfg {\n';
            result += '  node [shape="box"]\n';
            var options = {counter: 0, source: source};
            functions.concat(ast).forEach(function (ast, i) {
                var cfg;
                var label = '[[main]]';
                if (~ast.type.indexOf('Function')) {
                    cfg = esgraph(ast.body,  {omitExceptions: true});
                    label = 'function ' + (ast.id && ast.id.name || '') +
                        '(' + ast.params.map(function (p) { return p.name; }) + ')';
                } else
                    cfg = esgraph(ast, {omitExceptions: true});

                var count = 1;
                cfg[2].forEach(function(n) {!n.type && (n.label = count++)});

                cfg[1].prev.forEach(function(node) {
                    if(node.normal === cfg[1]) {
                        //console.log("Hallo");
                    }
                });
                //slice.slice(cfg[1].prev[0], "product");

                result += '  subgraph cluster_' + i + '{\n';
                result += '  label = "' + label + '"\n';
                result += '  ' + esgraph.dot(cfg, options) + "\n";
                result += '}';
            });
            result += '}';
            return result
        } catch (e) {
            console.log(e.message);
        }
    }());

    if (args.p) {
        console.log(ast);
    } else {
        console.log(ast);

    }

}(argv));

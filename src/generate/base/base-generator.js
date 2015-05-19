(function (ns) {

    // Dependencies
    var walker = require('estraverse')
    var common = require("../../base/common.js");

    // Shortcuts
    var Syntax = common.Syntax;

    /**
     * Abstract code generator
     * @constructor
     */
    var AbstractGenerator = function (program, options) {
        this.program = program;
        this.options = options || {};
        this.lines = createLineStack();
    };

    Base.extend(AbstractGenerator.prototype, {
        traverse: function (ast) {
            var lines = this.lines, that = this;

            walker.traverse(ast, {
                enter: function (node, parent) {
                    var ret = that.enter(node, parent, this);
                    if (node.type == Syntax.FunctionDeclaration) {
                        lines.changeIndention(1);
                    }
                    return ret;
                },
                leave: function (node, parent) {
                    if (node.type == Syntax.FunctionDeclaration) {
                        lines.changeIndention(-1);
                    }
                    return that.leave(node, parent, this);
                }
            })
        },
        enter: function (node, parent, controller) {
        },
        leave: function (node, parent, controller) {
        }
    });


    function createLineStack() {
        var arr = [];
        arr.push.apply(arr, arguments);
        var indent = "";
        arr.appendLine = function (lines) {
            var args = Array.prototype.slice.call(arguments);
            args.forEach(function (line) {
                line ? arr.push(indent + line) : arr.push("");
            })

        };
        arr.changeIndention = function (add) {
            while (add > 0) {
                indent += "    ";
                add--;
            }
            if (add < 0) {
                indent = indent.substr(0, indent.length + add * 4);
            }
        };
        arr.append = function (str) {
            this[this.length - 1] = this[this.length - 1] + str;
        };
        return arr;
    }

    ns.AbstractGenerator = AbstractGenerator;


}(exports));

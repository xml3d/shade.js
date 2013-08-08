(function (ns) {

    /**
     * @enum {string}
     */
    ns.TYPES = {
        ANY: "any",
        INT: "int",
        NUMBER: "number",
        BOOLEAN: "boolean",
        OBJECT: "object",
        ARRAY: "array",
        NULL: "null",
        UNDEFINED: "undefined",
        FUNCTION: "function",
        STRING: "string"
    }

    ns.OBJECT_KINDS = {
        ANY: "any",
        COLOR: "color", // virtual kinds
        FLOAT3: "float3", // virtual kinds
        NORMAL: "normal",
        MATRIX4: "matrix4",
        MATRIX3: "matrix3",
        COLOR_CLOSURE: "color_closure"
    }

    ns.SOURCES = {
        UNIFORM: "uniform",
        VERTEX: "vertex",
        CONSTANT: "constant"
    }

    /**
     * The virtual Normal type
     * @interface
     */
    var Normal = function () {
    };


    /**
     * Static function that  normalizes the
     * given normal in place and returns it
     *
     * @param {Normal} n
     * @returns {Normal}
     */
    Normal.normalize = function(n) {
        var length = Math.sqrt(n.x * n.x+ n.y * n.y+ n.z * n.z);
        if(!length)
            return n;
        n.x = n.x / length;
        n.y = n.y / length;
        n.z = n.z / length;
    };

    /**
     * The virtual Color type
     * @interface
     */
    var Color = function() {

    };

    /**
     * @param {object} node
     * @param {string} msg
     */
    ns.throwError = function(node, msg) {
        var loc = node && node.loc;
        if (loc && loc.start.line) {
            msg = "Line " + loc.start.line + ": " + msg;
        }
        var error = new Error(msg);
        error.loc = loc;
        throw error;
    }

}(exports));

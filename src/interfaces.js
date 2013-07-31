(function (ns) {

    ns.Shade = ns.Shade || {};

    /**
     * @enum
     */
    ns.Shade.TYPES = {
        ANY: "any",
        INT: "int",
        NUMBER: "number",
        BOOLEAN: "boolean",
        OBJECT: "object",
        NULL: "null",
        UNDEFINED: "undefined",
        FUNCTION: "function",
        STRING: "string"
    }

    ns.Shade.OBJECT_KINDS = {
        ANY: "any",
        COLOR: "color", // virtual kinds
        FLOAT3: "float3", // virtual kinds
        NORMAL: "normal",
        MATRIX4: "matrix4",
        MATRIX3: "matrix3",
        COLOR_CLOSURE: "color_closure"
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


}(exports));

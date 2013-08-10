(function (ns) {

    var objects = {
        Color : require("./color.js"),
        Shade : require("./shade.js"),
        Matrix4 : require("./matrix.js"),
        Math : require("./math.js"),
        Vector2 : require("./vec2.js")
    };

    exports.Registry = {
        getByName: function(name) {
            var result = objects[name];
            return result || null;
        },
        getInstanceForKind: function(kind) {
            for(var obj in objects) {
                if (objects[obj].kind == kind) {
                    return objects[obj].instance;
                }
            }
            return null;
        }
    }

}(exports));

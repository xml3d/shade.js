(function (ns) {

    var objects = {
        Shade : require("./shade.js"),
        //Matrix4 : require("./matrix.js"),
        Math : require("./math.js"),
        Vec2 : require("./vec2.js"),
        Vec3 : require("./vec3.js"),
        Color: require("./vec3.js"),
        Vec4 : require("./vec4.js"),
        Mat3 : require("./mat3.js"),
        Texture : require("./texture.js"),
        System: require("./system.js"),
        ColorClosure: require("./colorclosure.js")
    };

    exports.Registry = {
        name: "TypeInference",
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

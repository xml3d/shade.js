(function (ns) {

    var Scope = require("../../../type-system/scope.js"),
        Base = require("../../../base/index.js");


    var objects = {
        Shade : require("./shade.js"),
        Space : require("./space.js"),
        Math : require("./math.js"),
        Vec2 : require("./vec2.js"),
        Vec3 : require("./vec3.js"),
        Color: require("./vec3.js"),
        Vec4 : require("./vec4.js"),
        Mat3 : require("./mat3.js"),
        Mat4 : require("./mat4.js"),
        Texture : require("./texture.js"),
        ColorClosure: require("./colorclosure.js")
    };

    var Registry = {
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
    };


    /**
     * @constructor
     * @extends {Scope}
     */
    var InferenceScope = function(node, parentScope, opt) {
        opt = opt || {};
        Base.extend(opt, { registry: Registry });
        Scope.call(this, node, parentScope, opt);
    }

    Base.createClass(InferenceScope, Scope, {

        registerGlobals: function() {
            this.registerObject("Math", objects.Math);
            this.registerObject("Color",  objects.Color);
            this.registerObject("Vec2", objects.Vec2);
            this.registerObject("Vec3", objects.Vec3);
            this.registerObject("Vec4", objects.Vec4);
            this.registerObject("Texture", objects.Texture);
            this.registerObject("Shade", objects.Shade);
            this.registerObject("Space", objects.Space);
            this.registerObject("Mat3", objects.Mat3);
            this.registerObject("Mat4", objects.Mat4);
            this.declare("_env");
        }

    });

    exports.InferenceScope = InferenceScope;

}(exports));

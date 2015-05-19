(function(ns) {

    var Scope = require("../../../base/scope.js"),
        Context = require("../../../base/context.js"),
        Base = require("../../../base/index.js"),
        Shade = require("../../../interfaces.js"),
        TypeInfo = require("../../../base/typeinfo.js").TypeInfo,
        common = require("../../../base/common.js");


    var Types = Shade.TYPES,
        Kinds = Shade.OBJECT_KINDS;

    var objects = {
        Shade : require("./shade.js"),
        Space : require("./space.js"),
        Math : require("./math.js"),
        System : require("./system.js"),
        Vec2 : require("./vec2.js"),
        Vec3 : require("./vec3.js"),
        Color: require("./vec3.js"),
        Vec4 : require("./vec4.js"),
        Mat3 : require("./mat3.js"),
        Mat4 : require("./mat4.js"),
        Texture : require("./texture.js")
    };

    var Registry = {
        name: "GLSLTransformRegistry",
        getByName: function(name) {
            var result = objects[name];
            return result || null;
        },
        getInstanceForKind: function(kind) {
            for(var obj in objects) {
                //noinspection JSUnfilteredForInLoop
                if (objects[obj].kind == kind) {
                    //noinspection JSUnfilteredForInLoop
                    return objects[obj].instance;
                }
            }
            return null;
        }
    };


    /**
     * @param root
     * @param {string} entry
     * @param opt
     * @extends {Context}
     * @constructor
     */
    var GLTransformContext = function(root, entry, vertexShader, opt) {
        opt.mainFunction = entry;
        Context.call(this, root, opt);
        this.usedParameters = {
            shader: {},
            system: {},
            uexp: {}
        };

        this.uniformExpressions = opt.uniformExpressions || {};

        this.vertexShader = vertexShader;
        this.systemParameters = {};
        this.blockedNames = [];
        this.topDeclarations = [];
        this.internalFunctions = {};
        this.idNameMap = {};
        this.headers = []; // Collection of header lines to define

        this.globalParameters = root.globalParameters && root.globalParameters[entry] && root.globalParameters[entry][0] ? root.globalParameters[entry][0].extra.info : {};


    };

    Base.createClass(GLTransformContext, Context, {
        createScope: function(node, parent, name) {
            return new GLTransformScope(node, parent, {name: name});
        },
        getTypeInfo: function(node) {
            return common.getTypeInfo(node, this.getScope());
        },
        addHeader: function(headerStr) {
            if (this.headers.indexOf(headerStr) == -1) {
                this.headers.push(headerStr);
            }
        }
    });

    /**
     * @constructor
     * @extends {Scope}
     */
    var GLTransformScope = function(node, parentScope, opt) {
        Scope.call(this, node, parentScope, opt);
        this.setRegistry(Registry);
    };

    Base.createClass(GLTransformScope, Scope, {

        registerGlobals: function() {
            this.registerObject("Math", objects.Math);
            this.registerObject("Color",  objects.Color);
            this.registerObject("Vec2", objects.Vec2);
            this.registerObject("Vec3", objects.Vec3);
            this.registerObject("Vec4", objects.Vec4);
            this.registerObject("Texture", objects.Texture);
            this.registerObject("Shade", objects.Shade);
            this.registerObject("Mat3", objects.Mat3);
            this.registerObject("Mat4", objects.Mat4);
            this.registerObject("Space", objects.Space);

            this.declareVariable("gl_FragCoord", false);
            this.updateTypeInfo("gl_FragCoord", new TypeInfo({
                extra: {
                    type: Types.OBJECT,
                    kind: Kinds.FLOAT3
                }
            }));
        }
    });



    ns.GLTransformScope = GLTransformScope;
    ns.GLTransformContext = GLTransformContext;

}(exports));

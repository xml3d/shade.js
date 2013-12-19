(function(ns) {

    var Scope = require("../../../base/scope.js"),
        TransformContext = require("../../base/context.js").TransformContext,
        Base = require("../../../base/index.js"),
        Shade = require("../../../interfaces.js"),
        common = require("../../../base/common.js");


    var Types = Shade.TYPES,
        Kinds = Shade.OBJECT_KINDS,
        ANNO = common.ANNO,
        Syntax = common.Syntax;


    var objects = {
        Shade : require("./shade.js"),
//        Space : require("./space.js"),
        Math : require("./math.js"),
        System : require("./system.js"),
        Vec2 : require("./vec2.js"),
        Vec3 : require("./vec3.js"),
//        Color: require("./vec3.js"),
        Vec4 : require("./vec4.js"),
//        Mat3 : require("./mat3.js"),
//        Mat4 : require("./mat4.js"),
        Texture : require("./texture.js")
    };

    var Registry = {
        name: "OSLTransformRegistry",
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
     * @extends {TransformContext}
     * @constructor
     */
    var OSLTransformContext = function(root, entry, opt) {
        TransformContext.call(this, root, opt);
        //console.log(JSON.stringify(root.globalParameters));
        /*this.usedParameters = {
            shader: {},
            system: {}
        };
        this.systemParameters = {};
        this.blockedNames = [];
        this.topDeclarations = [];
        this.internalFunctions = {};
        this.idNameMap = {};
        this.headers = []; // Collection of header lines to define*/

        this.globalParameters = root.globalParameters && root.globalParameters[entry] && root.globalParameters[entry][0] ? root.globalParameters[entry][0].extra.info : {};


    };

    Base.createClass(OSLTransformContext, TransformContext, {
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
        },
        createEnvironmentParameter: function(parameterName, typeInfo) {
            var newParameterName = this.getSafeName(capitaliseFirstLetter(parameterName));
            this.addUsedParameter(newParameterName, this.globalParameters[parameterName]);
            var propertyLiteral = { type: Syntax.Identifier, name: newParameterName };
            ANNO(propertyLiteral).copy(typeInfo);
            return propertyLiteral;
        },
        createSystemParameter: function(parameterName, typeInfo) {
            if(typeInfo.isFunction()) {
                return;
            }
            var newParameterName = this.getSafeName(capitaliseFirstLetter(parameterName));
            this.addUsedParameter(newParameterName, this.globalParameters[parameterName]);
            var propertyLiteral = { type: Syntax.Identifier, name: newParameterName };
            ANNO(propertyLiteral).copy(typeInfo);
            return propertyLiteral;
        }
    });

    function capitaliseFirstLetter(string) {
        return string.charAt(0).toUpperCase() + string.slice(1);
    }

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
//            this.registerObject("Color",  objects.Color);
            this.registerObject("Vec2", objects.Vec2);
            this.registerObject("Vec3", objects.Vec3);
            this.registerObject("Vec4", objects.Vec4);
            this.registerObject("Texture", objects.Texture);
            this.registerObject("Shade", objects.Shade);
//            this.registerObject("Mat3", objects.Mat3);
//            this.registerObject("Mat4", objects.Mat4);
//            this.registerObject("Space", objects.Space);
            this.registerObject("this", objects.System);

        }
    });



    ns.GLTransformScope = GLTransformScope;
    ns.OSLTransformContext = OSLTransformContext;

}(exports));

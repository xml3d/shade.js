var TypeSystem = require("../../../type-system/type-system.js");

var Scope = require("../../../type-system/scope.js"),
	Base = require("../../../base/index.js");


/**
 * @constructor
 * @extends {Scope}
 */
var InferenceScope = function (node, parentScope, opt) {
	Scope.call(this, node, parentScope, opt);
};

Base.createClass(InferenceScope, Scope, {

	registerGlobals: function () {
		this.declarePredefined("Math", TypeSystem.getPredefinedObject("Math"));
		this.declarePredefined("Vec2", TypeSystem.getPredefinedObject("Vec2"));
		this.declarePredefined("Vec3", TypeSystem.getPredefinedObject("Vec3"));
		this.declarePredefined("Vec4", TypeSystem.getPredefinedObject("Vec4"));
		/*this.registerObject("Math", objects.Math);
		 this.registerObject("Color",  objects.Color);
		 this.registerObject("Vec2", objects.Vec2);
		 this.registerObject("Vec3", objects.Vec3);
		 this.registerObject("Vec4", objects.Vec4);
		 this.registerObject("Texture", objects.Texture);
		 this.registerObject("Shade", objects.Shade);
		 this.registerObject("Space", objects.Space);
		 this.registerObject("Mat3", objects.Mat3);
		 this.registerObject("Mat4", objects.Mat4);
		 this.declare("_env");*/
	}

});

exports.InferenceScope = InferenceScope;


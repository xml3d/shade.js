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
		this.declarePredefined("Mat3", TypeSystem.getPredefinedObject("Mat3"));
		this.declarePredefined("Mat4", TypeSystem.getPredefinedObject("Mat4"));
		this.declarePredefined("this", TypeSystem.getPredefinedObject("System"));
		this.declarePredefined("Space", TypeSystem.getPredefinedObject("Space"));
		/*this.registerObject("Math", objects.Math);
		 this.registerObject("Color",  objects.Color);
		 this.registerObject("Texture", objects.Texture);
		 this.registerObject("Shade", objects.Shade);
		 this.registerObject("Space", objects.Space);
		 this.declare("_env");*/
	}

});

exports.InferenceScope = InferenceScope;


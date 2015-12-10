// Dependencies
var Shade = require("../../../interfaces.js");
var Tools = require("../../tools.js");
var Syntax = require('estraverse').Syntax;

// Shortcuts
var TYPES = Shade.TYPES,
    KINDS = Shade.OBJECT_KINDS;


var SystemDefines = {};
SystemDefines.CANVAS_DIMENSIONS = "coords";
SystemDefines.DERIVATE_EXTENSION = "#extension GL_OES_standard_derivatives : enable";

var CoordsType = {
    type: Shade.TYPES.OBJECT,
    kind: Shade.OBJECT_KINDS.FLOAT3,
    source: Shade.SOURCES.UNIFORM
};


var SystemProperties = {
    coords: function (node) {
            node.property.name = "gl_FragCoord";
            return node.property;
    },
    normalizedCoords:  function () {
            return {
                type: Syntax.NewExpression,
                callee: {
                    type: Syntax.Identifier,
                    name: "Vec3"
                },
                arguments: [
                    {
                        type: Syntax.BinaryExpression,
                        left: {
                            type: Syntax.MemberExpression,
                            object: {
                                type: Syntax.Identifier,
                                name: "gl_FragCoord"
                            },
                            property: {
                                type: Syntax.Identifier,
                                name: "xyz"
                            }
                        },
                        right: {
                            type: Syntax.Identifier,
                            name: SystemDefines.CANVAS_DIMENSIONS
                        },
                        operator: "/",
                        extra: {
                            type: Shade.TYPES.OBJECT,
                            kind: "Vec3"
                        }
                    }
                ],
                extra: {
                    type: Shade.TYPES.OBJECT,
                    kind: "Vec3"
                }
            }
    },
    height:  function (node) {
            var parameterName = Tools.getNameForSystem(SystemDefines.CANVAS_DIMENSIONS);
            state.usedParameters.system[parameterName] = state.systemParameters[SystemDefines.CANVAS_DIMENSIONS];

            node.property.name = parameterName + ".y";
            return node.property;
    },
    width:  function (node) {
            var parameterName = Tools.getNameForSystem(SystemDefines.CANVAS_DIMENSIONS);
            state.usedParameters.system[parameterName] = state.systemParameters[SystemDefines.CANVAS_DIMENSIONS];

            node.property.name = parameterName + ".x";
            return node.property;
    },
    fwidth: function (node, context) {
            context.addHeader(SystemDefines.DERIVATE_EXTENSION);
            return Tools.removeMemberFromExpression(node);
    },
    dx: function (node, context) {
            context.addHeader(SystemDefines.DERIVATE_EXTENSION);
            var result = Tools.removeMemberFromExpression(node);
            result.name = "dFdx";
            return result;
    },
    dy:  function (node, context) {
            context.addHeader(SystemDefines.DERIVATE_EXTENSION);
            var s = Tools.removeMemberFromExpression(node);
            var result = Tools.removeMemberFromExpression(node);
            result.name = "dFdy";
            return result;
    }

};

module.exports = {
    call: function (node, name) {},
    property: function (node, name, context) {
        if(SystemProperties.hasOwnProperty(name)) {
            return SystemProperties[name](node, context);
        }

    }
};

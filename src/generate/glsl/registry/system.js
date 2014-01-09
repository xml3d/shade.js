(function (ns) {

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

    var CoordsType =  {
        type: Shade.TYPES.OBJECT,
        kind: Shade.OBJECT_KINDS.FLOAT3,
        source: Shade.SOURCES.UNIFORM
    };


    var DerivedParameters = {
//        coords: {
//            property: function (node) {
//                node.property.name = "gl_FragCoord";
//                return node.property;
//            }
//        },
        normalizedCoords: {
            property: function (node, parent, context, state) {
                var parameterName = Tools.getNameForSystem(SystemDefines.CANVAS_DIMENSIONS);
                var canvasDimensions = state.systemParameters[SystemDefines.CANVAS_DIMENSIONS];
                if(!canvasDimensions)
                   Shade.throwError(node, "Internal Error: No canavas dimensions defined" );

                state.usedParameters.system[parameterName] = canvasDimensions;

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
                                name: Tools.getNameForSystem(SystemDefines.CANVAS_DIMENSIONS)
                            },
                            operator: "/",
                            extra: {
                                type: Shade.TYPES.OBJECT,
                                kind: Shade.OBJECT_KINDS.FLOAT3
                            }
                        }
                    ],
                    extra: {
                        type: Shade.TYPES.OBJECT,
                        kind: Shade.OBJECT_KINDS.FLOAT3
                    }
                }
            }
        },
        height: {
            property: function (node, parent, context, state) {
                var parameterName = Tools.getNameForSystem(SystemDefines.CANVAS_DIMENSIONS);
                state.usedParameters.system[parameterName] = state.systemParameters[SystemDefines.CANVAS_DIMENSIONS];

                node.property.name = parameterName + ".y";
                return node.property;
            }
        },
        width: {
            property: function (node, parent, context, state) {
                var parameterName = Tools.getNameForSystem(SystemDefines.CANVAS_DIMENSIONS);
                state.usedParameters.system[parameterName] = state.systemParameters[SystemDefines.CANVAS_DIMENSIONS];

                node.property.name = parameterName + ".x";
                return node.property;
            }
        },
        fwidth: {
            property: function (node, parent, context, state) {
                state.addHeader(SystemDefines.DERIVATE_EXTENSION);
                return Tools.removeMemberFromExpression(node);
            }
        },
        dx: {
            property: function (node, parent, context, state) {
                state.addHeader(SystemDefines.DERIVATE_EXTENSION);
                var result = Tools.removeMemberFromExpression(node);
                result.name = "dFdx";
                return result;
            }
        },
        dy: {
            property: function (node, parent, context, state) {
                state.addHeader(SystemDefines.DERIVATE_EXTENSION);
                var s = Tools.removeMemberFromExpression(node);
                var result = Tools.removeMemberFromExpression(node);
                result.name = "dFdy";
                return result;
            }
        }

    };

    Tools.extend(ns, {
        id: "System",
        object: {
            constructor: null,
            static: DerivedParameters
        },
        instance: null,
        derivedParameters: DerivedParameters
    });
}(exports));

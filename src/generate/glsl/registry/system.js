(function (ns) {

    var Shade = require("../../../interfaces.js"),
        Tools = require("./tools.js"),
        Syntax = require('estraverse').Syntax;


    var SystemParameterNames = {};
    SystemParameterNames.CANVAS_DIMENSIONS = "coords";

    var CoordsType =  {
        type: Shade.TYPES.OBJECT,
        kind: Shade.OBJECT_KINDS.FLOAT3,
        source: Shade.SOURCES.UNIFORM
    };

    var DerivedParameters = {
        coords: {
            property: function (node) {
                node.property.name = "gl_FragCoord";
                return node.property;
            }
        },
        normalizedCoords: {
            property: function (node, parent, context, state) {
                var parameterName = Tools.getNameForSystem(SystemParameterNames.CANVAS_DIMENSIONS);
                state.usedParameters.system[parameterName] = state.systemParameters[SystemParameterNames.CANVAS_DIMENSIONS];

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
                                name: Tools.getNameForSystem(SystemParameterNames.CANVAS_DIMENSIONS)
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
                var parameterName = Tools.getNameForSystem(SystemParameterNames.CANVAS_DIMENSIONS);
                state.usedParameters.system[parameterName] = state.systemParameters[SystemParameterNames.CANVAS_DIMENSIONS];

                node.property.name = parameterName + ".y";
                return node.property;
            }
        },
        width: {
            property: function (node, parent, context, state) {
                var parameterName = Tools.getNameForSystem(SystemParameterNames.CANVAS_DIMENSIONS);
                state.usedParameters.system[parameterName] = state.systemParameters[SystemParameterNames.CANVAS_DIMENSIONS];

                node.property.name = parameterName + ".x";
                return node.property;
            }
        }

    };

    Tools.extend(ns, {
        id: "System",
        object: {
            constructor: null,
            static: null
        },
        instance: null,
        derivedParameters: DerivedParameters
    });
}(exports));

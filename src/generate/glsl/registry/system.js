(function (ns) {

    var Base = require("../../../base/index.js"),
        Shade = require("../../../interfaces.js"),
        Syntax = require('estraverse').Syntax;


    var SystemParameterNames = {
        "coords" : "_sys_coords",
        "height": "_sys_height",
        "width": "_sys_width"
    }

    var CoordsType =  {
        type: Shade.TYPES.OBJECT,
        kind: Shade.OBJECT_KINDS.FLOAT3,
        source: Shade.SOURCES.UNIFORM
    };

    var SystemEntry = {
        coords: {
            property: function (node) {
                node.property.name = "gl_FragCoord";
                return node.property;
            }
        },
        normalizedCoords: {
            property: function (node, parent, context, state) {
                state.globalParameters[SystemParameterNames.coords] = CoordsType;
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
                                name: SystemParameterNames.coords
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
                state.globalParameters[SystemParameterNames.coords] = CoordsType;
                node.property.name = SystemParameterNames.coords + ".y";
                return node.property;
            }
        },
        width: {
            property: function (node, parent, context, state) {
                state.globalParameters[SystemParameterNames.coords] = CoordsType;
                node.property.name = SystemParameterNames.coords + ".x";
                return node.property;
            }
        }

    };

    Base.extend(ns, {
        id: "System",
        object: {
            constructor: null,
            static: SystemEntry
        },
        instance: null
    });
}(exports));

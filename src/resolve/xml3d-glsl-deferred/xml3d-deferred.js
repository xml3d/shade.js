(function (ns) {

        var Shade = require("../../interfaces.js"),
            SpaceVectorType = Shade.SpaceVectorType;

        ns.emissive = {
            inputSpaces: [
                SpaceVectorType.OBJECT
            ]
        }

        ns.diffuse = {
            inputSpaces: [
                SpaceVectorType.OBJECT,
                SpaceVectorType.VIEW_NORMAL,
                SpaceVectorType.OBJECT
            ]
        }

        ns.phong = {
            inputSpaces: [
                SpaceVectorType.OBJECT,
                SpaceVectorType.VIEW_NORMAL,
                SpaceVectorType.OBJECT
            ]
        }

        ns.cookTorrance = {
            inputSpaces: [
                SpaceVectorType.OBJECT,
                SpaceVectorType.VIEW_NORMAL,
                SpaceVectorType.OBJECT,
                SpaceVectorType.OBJECT
            ]
        }

        ns.ward = {
            inputSpaces: [
                SpaceVectorType.OBJECT,
                SpaceVectorType.VIEW_NORMAL,
                SpaceVectorType.VIEW_NORMAL,
                SpaceVectorType.OBJECT,
                SpaceVectorType.OBJECT
            ]
        }

        ns.scatter = {
            inputSpaces: [
                SpaceVectorType.OBJECT,
                SpaceVectorType.VIEW_NORMAL,
                SpaceVectorType.OBJECT
            ]
        }

        ns.reflect = {
            inputSpaces: [
                SpaceVectorType.WORLD_NORMAL,
                SpaceVectorType.OBJECT
            ]
        }

        ns.refract = {
            inputSpaces: [
                SpaceVectorType.WORLD_NORMAL,
                SpaceVectorType.OBJECT,
                SpaceVectorType.OBJECT
            ]
        }

}(exports));

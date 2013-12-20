(function (ns) {

        var Shade = require("../../interfaces.js"),
            SpaceVectorType = Shade.SpaceVectorType;

        ns.phong = {
            inputSpaces: [
                SpaceVectorType.OBJECT,
                SpaceVectorType.VIEW_NORMAL,
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

}(exports));

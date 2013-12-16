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

}(exports));

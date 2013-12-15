(function (ns) {

    var Base = require("./../base/index.js"), walker = require('estraverse'), Context = require("../base/context.js"), Shade = require("./../interfaces.js"), common = require("../base/common.js"), Set = require("analyses").Set;

    // Shortcuts
    var Syntax = walker.Syntax, ANNO = common.ANNO;





    exports.createClass = Base.createClass;
    exports.extend = Base.extend;

}(exports))

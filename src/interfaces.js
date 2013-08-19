(function (ns) {
    var Base = require("./base/index.js");
    /**
     * @enum {string}
     */
    ns.TYPES = {
        ANY: "any",
        INT: "int",
        NUMBER: "number",
        BOOLEAN: "boolean",
        OBJECT: "object",
        ARRAY: "array",
        NULL: "null",
        UNDEFINED: "undefined",
        FUNCTION: "function",
        STRING: "string"
    }

    ns.OBJECT_KINDS = {
        ANY: "any",
        FLOAT2: "float2", // virtual kinds
        FLOAT3: "float3", // virtual kinds
        FLOAT4: "float4", // virtual kinds
        NORMAL: "normal",
        MATRIX4: "matrix4",
        MATRIX3: "matrix3",
        COLOR_CLOSURE: "color_closure"
    }

    ns.SOURCES = {
        UNIFORM: "uniform",
        VERTEX: "vertex",
        CONSTANT: "constant"
    }

    function fillVector(dest, vecSize, arguments){
        var color = false;
        if(arguments.length == 0 ){
            for(var i = 0; i < vecSize; ++i)
                dest[i] = 0;
            if(color) dest[3] = 1;
            return;
        }
        if(arguments.length == 1 && !isNaN(arguments[0])){
            for(var i = 0; i < vecSize; ++i)
                dest[i] = arguments[0];
            if(color) dest[3] = 1;
            return;
        }

        var idx = 0;
        for(var i = 0; idx < vecSize && i < arguments.length; ++i){
            var arg= arguments[i], cnt = 1;
            if(arg instanceof Vec2) cnt = 2;
            else if(arg instanceof Vec3) cnt = 3;
            else if(arg instanceof Vec4) cnt = 4;

            if(cnt == 1)
                dest[idx++] = arg || 0;
            else
                for(var j = 0; idx < vecSize && j < cnt; ++j){
                    dest[idx++] = arg[j];
                }
        }
        if(i < arguments.length)
            throw new Error("Too many arguments for " + (color ? "Color" : "Vec" + vecSize) + ".");
        if(idx < vecSize){
            if(color && (idx == 3))
                dest[3] = 1;
            else
                throw new Error("Not enough arguments for " + (color ? "Color" : "Vec" + vecSize) + ".");
        }
    }


    // TODO: Generate Swizzle functions
    var SWIZZLE_KEYS = [
        ['x','y','z','w'],
        ['r', 'g', 'b', 'a'],
        ['s', 't', 'p', 'q']
    ]

    function addSwizzles(prototype, vecCount, maskCount, withSetter){
        var max = Math.pow(vecCount, maskCount);
        for(var i = 0; i < max; ++i){
            var indices = [], keys = ["", "", ""], val = i, args = [];
            var setterArgs = [], generateSetter = withSetter;
            for(var j = 0; j < maskCount; ++j){
                var idx = val % vecCount;
                indices.push(idx);
                if(generateSetter){
                    if(setterArgs[idx] === undefined)
                        setterArgs[idx] = 'other[' + j + ']';
                    else
                        generateSetter = false;
                }
                for(var k = 0; k < SWIZZLE_KEYS.length; ++k){
                    keys[k] += SWIZZLE_KEYS[k][idx];
                }
                val = Math.floor(val / vecCount);
                args.push('this['+ idx + ']' );
            }

            var funcArgs = "";
            var body = '  return getVec' + maskCount + '(this, ' + args.join(", ") + ');\n';
            if(generateSetter){
                for(var j = 0; j < vecCount; ++j){
                    if(setterArgs[j] === undefined)
                        setterArgs[j] = 'this[' + j + ']';
                }
                switch(maskCount){
                    case 2 : funcArgs = "x, y"; break;
                    case 3 : funcArgs = "x, y, z"; break;
                    case 4 : funcArgs = "x, y, z, w"; break;
                }

                body = "  if(arguments.length == 0)\n  " + body +
                       "  else{\n" +
                       "    var other=getVec" + maskCount + '(this, ' + funcArgs + ');\n' +
                       "    return getVec" + vecCount + '(this, ' + setterArgs.join(", ") + ');\n' +
                       "  }\n";
            }
            var functionCode = 'function(' + funcArgs +  '){\n' + body + '}';
            try{
                var result = eval("(" + functionCode + ")");
                for(var j = 0; j < keys.length; ++j)
                    prototype[keys[j]] = result;
            }
            catch(e){
                console.error("Error Compiling Code:\n" + functionCode);
                throw e;

            }


        }
    }


    /**
     * The virtual Vec2 type
     * @constructor
     */
     var Vec2 = function(x, y){
        fillVector(this, 2, arguments);
     }


     function getVec2(){
        if(arguments[0] instanceof Vec2)
            return arguments[0];
        var obj =  new Vec2();
        Vec2.apply(obj, arguments);
        return obj;
     }

     Vec2.prototype.add = function(x, y){ // 0 arguments => identity or error?
        var add = getVec2.apply(null, arguments);
        return new Vec2(this[0] + add[0], this[1] + add[1]);
     }
     Vec2.prototype.sub = function(x, y){
        var sub = getVec2.apply(null, arguments);
        return new Vec2(this[0] - sub[0], this[1] - sub[1]);
     }
     Vec2.prototype.mul = function(x, y){
        var other = getVec2.apply(null, arguments);
        return new Vec2(this[0] * other[0], this[1] * other[1]);
     }
     Vec2.prototype.div = function(x, y){
        var other = getVec2.apply(null, arguments);
        return new Vec2(this[0] / other[0], this[1] / other[1]);
     }
     Vec2.prototype.mod = function(x, y){
        var other = getVec2.apply(null, arguments);
        return new Vec2(this[0] % other[0], this[1] % other[1]);
     }
     Vec2.prototype.dot = function(x, y){
        var other = getVec2.apply(null, arguments);
        return this[0]*other[0] + this[1]*other[1];
     }
     Vec2.prototype.abs = function(){
        return new Vec2(Math.abs(this[0]), Math.abs(this[1]));
     }
     Vec2.prototype.length = function(length){
        if(arguments.length == 0)
            return Math.sqrt(this.dot(this));
        else{
            return this.mul(length / this.length());
        }
     }
     Vec2.prototype.normalize = function(){
        return this.length(1);
     }

     Vec2.prototype.xy = Vec2.prototype.rg = Vec2.prototype.st = function(x,y){
        if(arguments.length == 0)
            return this;
        else{
            return getVec2.apply(null, arguments);
        }
     }
     Vec2.prototype.x = Vec2.prototype.r = Vec2.prototype.s = function(x){
        if(arguments.length == 0)
            return this[0];
        else
            return this.xy(x, this[1]);
     }
     Vec2.prototype.y = Vec2.prototype.g = Vec2.prototype.t = function(y){
        if(arguments.length == 0)
            return this[1];
        else
            return this.xy(this[0], y);
     }

     addSwizzles(Vec2.prototype, 2, 2, true);
     addSwizzles(Vec2.prototype, 2, 3, false);
     addSwizzles(Vec2.prototype, 2, 4, false);



     /**
      * The virtual Vec3 type
      * @constructor
      */
     var Vec3 = function(x, y, z ){
        fillVector(this, 3, arguments);
     }

     function getVec3(){
        if(arguments[0] instanceof Vec3)
            return arguments[0];
        var obj = new Vec3();
        Vec3.apply(obj, arguments);
        return obj;
     }

     Vec3.prototype.add = function(x, y, z){
        var other = getVec3.apply(null, arguments);
        return new Vec3(this[0] + other[0], this[1] + other[1], this[2] + other[2]);
     }
     Vec3.prototype.sub = function(x, y, z){
        var other = getVec3.apply(null, arguments);
        return new Vec3(this[0] - other[0], this[1] - other[1], this[2] - other[2]);
     }
     Vec3.prototype.mul = function(x, y, z){
        var other = getVec3.apply(null, arguments);
        return new Vec3(this[0] * other[0], this[1] * other[1], this[2] * other[2]);
     }
     Vec3.prototype.div = function(x, y, z){
        var other = getVec3.apply(null, arguments);
        return new Vec3(this[0] / other[0], this[1] / other[1], this[2] / other[2]);
     }
     Vec3.prototype.mod = function(x, y, z){
        var other = getVec3.apply(null, arguments);
        return new Vec3(this[0] % other[0], this[1] % other[1], this[2] % other[2]);
     }
     Vec3.prototype.abs = function(){
        return new Vec3(Math.abs(this[0]), Math.abs(this[1]), Math.abs(this[2]));
     }
     Vec3.prototype.dot = function(x, y, z){
        var other = getVec3.apply(null, arguments);
        return this[0]*other[0] + this[1]*other[1] + this[2]*other[2];
     }
     Vec3.prototype.cross = function(x, y, z){
        var other = getVec3.apply(null, arguments);
        var x = this[1]*other[2] - other[1]*this[2];
        var y = this[2]*other[0] - other[2]*this[0];
        var z = this[0]*other[1] - other[0]*this[1];
        return new Vec3(x, y, z);
     }
     Vec3.prototype.length = function(length){
        if(arguments.length == 0)
            return Math.sqrt(this.dot(this));
        else{
            return this.mul(length / this.length());
        }
     }
     Vec3.prototype.normalize = function(){
        return this.length(1);
     }
     Vec3.prototype.xyz = Vec3.prototype.rgb = Vec3.prototype.stp = function(x, y, z){
        if(arguments.length == 0)
            return this;
        else
            return new Vec3(x, y, z);
     }
     Vec3.prototype.x = Vec3.prototype.r = Vec3.prototype.s = function(x){
        if(arguments.length == 0)
            return this[0];
        else
            return new Vec3(x, this[1], this[2]);
     }
     Vec3.prototype.y = Vec3.prototype.g = Vec3.prototype.t = function(y){
        if(arguments.length == 0)
            return this[1];
        else
            return new Vec3(this[0], y, this[2]);
     }
     Vec3.prototype.z = Vec3.prototype.b = Vec3.prototype.p = function(z){
        if(arguments.length == 0)
            return this[2];
        else
            return new Vec3(this[0], this[1], z);
     }
     addSwizzles(Vec3.prototype, 3, 2, true);
     addSwizzles(Vec3.prototype, 3, 3, true);
     addSwizzles(Vec3.prototype, 3, 4, false);


     /**
      * The virtual Vec4 type
      * @constructor
      */
     var Vec4 = function(x, y, z, w ){
        fillVector(this, 4, arguments)
     }

     function getVec4(){
        if(arguments[0] instanceof Vec4)
            return arguments[0];
        var obj = new Vec4();
        Vec4.apply(obj, arguments);
        return obj;
     }

     Vec4.prototype.add = function(x, y, z, w){
        var other = getVec4.apply(null, arguments);
        return new Vec4(this[0] + other[0], this[1] + other[1], this[2] + other[2], this[3] + other[3]);
     }
     Vec4.prototype.sub = function(x, y, z, w){
        var other = getVec4.apply(null, arguments);
        return new Vec4(this[0] - other[0], this[1] - other[1], this[2] - other[2], this[3] - other[3]);
     }
     Vec4.prototype.mul = function(x, y, z, w){
        var other = getVec4.apply(null, arguments);
        return new Vec4(this[0] * other[0], this[1] * other[1], this[2] * other[2], this[3] * other[3]);
     }
     Vec4.prototype.div = function(x, y, z, w){
        var other = getVec4.apply(null, arguments);
        return new Vec4(this[0] / other[0], this[1] / other[1], this[2] / other[2], this[3] / other[3]);
     }
     Vec4.prototype.mod = function(x, y, z, w){
        var other = getVec4.apply(null, arguments);
        return new Vec4(this[0] % other[0], this[1] % other[1], this[2] % other[2], this[3] % other[3]);
     }
     Vec4.prototype.abs = function(){
        return new Vec4(Math.abs(this[0]), Math.abs(this[1]), Math.abs(this[2]), Math.abs(this[3]));
     }
     Vec4.prototype.dot = function(x, y, z, w){
        var other = getVec4.apply(null, arguments);
        return this[0]*other[0] + this[1]*other[1] + this[2]*other[2] + this[3]*other[3];
     }
     Vec4.prototype.length = function(length){
        if(arguments.length == 0)
            return Math.sqrt(this.dot(this));
        else{
            return this.mul(length / this.length());
        }
     }
     Vec4.prototype.normalize = function(){
        return this.length(1);
     }
     Vec4.prototype.xyzw = Vec4.prototype.rgba = Vec4.prototype.stpq = function(x, y, z, w){
        if(arguments.length == 0)
            return this;
        else
            return getVec4.apply(null, arguments);
     }
     Vec4.prototype.x = Vec4.prototype.r = Vec4.prototype.s = function(x){
        if(arguments.length == 0)
            return this[0];
        else
            return getVec4(x, this[1], this[2], this[3]);
     }

     Vec4.prototype.y = Vec4.prototype.g = Vec4.prototype.t = function(y){
        if(arguments.length == 0)
            return this[1];
        else
            return getVec4(this[0], y, this[2], this[3]);
     }
     Vec4.prototype.z = Vec4.prototype.b = Vec4.prototype.p = function(z){
        if(arguments.length == 0)
            return this[2];
        else
            return getVec4(this[0], this[1], z, this[3]);
     }
     Vec4.prototype.w = Vec4.prototype.a = Vec4.prototype.q = function(w){
        if(arguments.length == 0)
            return this[3];
        else
            return getVec4(this[0], this[1],this[2], w );
     }
     addSwizzles(Vec4.prototype, 4, 2, true);
     addSwizzles(Vec4.prototype, 4, 3, true);
     addSwizzles(Vec4.prototype, 4, 4, true);

     /**
      * The virtual Color type
      * @constructor
      */
     var Color = Vec4;

    var Shade = {};

    Shade.clamp = function(x, minVal, maxVal) {
        return Math.min(Math.max(x, minVal), maxVal);
    };

    Shade.smoothstep = function(edge1, edge2, x) {
        var t = Shade.clamp((x - edge1) / (edge2 - edge1), 0.0, 1.0);
        return t * t * (3.0 - 2.0 * t);
    };

    Shade.step = function(edge, x) {
        return x < edge ? 0 : 1;
    };

    Shade.fract = function(x) {
        return x - Math.floor(x);
    }


    /**
     * @param {object} node
     * @param {string} msg
     */
    ns.throwError = function(node, msg) {
        var loc = node && node.loc;
        if (loc && loc.start.line) {
            msg = "Line " + loc.start.line + ": " + msg;
        }
        var error = new Error(msg);
        error.loc = loc;
        throw error;
    }

    ns.Vec2 = Vec2;
    ns.Vec3 = Vec3;
    ns.Vec4 = Vec4;
    ns.Color = Color;
    ns.Shade = Shade;

}(exports));

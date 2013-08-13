(function (ns) {

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
        COLOR: "color", // virtual kinds
        FLOAT2: "float2", // virtual kinds
        FLOAT3: "float3", // virtual kinds
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

    function getVec2(vec2OrX, y){
        if(vec2OrX instanceof Vec2)
            return vec2OrX;
        return new Vec2(vec2OrX, y);
    }


    // TODO: Generate Swizzle functions
    function addSwizzles(prototype, srcCount, destCount, withSetter){
        var max = Math.pow(srcCount, destCount);
        for(var i = 0; i < max; ++i){
            var indices = [], key = "", val = i, args = [];
            for(var j = 0; j < destCount; ++j){
                var idx = val % srcCount;
                indices.push(idx);
                var char = String.charFromCode(120 + (val % srcCount));
                val += char; val = Math.floor(val / srcCount);
                args.push('this['+ idx + ']' );
            }
            if(prototype[key] !== undefined)
                continue;

            var getter = '  return new Vec' + destCount + '(' + args[0] + ');';
            if(withSetter){

            }

            var functionCode = 'function(){';
        }
    }


    /**
     * The virtual Vec2 type
     * @constructor
     */
     var Vec2 = function(vec2OrX, y){
        var isVec = (vec2OrX instanceof Vec2);
        this[0] = isVec ? vec2OrX.x : vec2OrX || 0;
        this[1] = isVec ? vec2OrX.y : y !== undefined ? y : this[0];
     }

     Vec2.prototype.add = function(vec2OrX, y){ // 0 arguments => identity or error?
        var add = getVec2(vec2OrX, y);
        return new Vec2(this[0] + add[0], this[1] + add[1]);
     }
     Vec2.prototype.sub = function(vec2OrX, y){
        var sub = getVec2(vec2OrX, y);
        return new Vec2(this[0] - sub[0], this[1] - sub[1]);
     }
     Vec2.prototype.mul = function(vec2OrX, y){
        var other = getVec2(vec2OrX, y);
        return new Vec2(this[0] * other[0], this[1] * other[1]);
     }
     Vec2.prototype.div = function(vec2OrX, y){
        var other = getVec2(vec2OrX, y);
        return new Vec2(this[0] / other[0], this[1] / other[1]);
     }
     Vec2.prototype.mod = function(vec2OrX, y){
        var other = getVec2(vec2OrX, y);
        return new Vec2(this[0] % other[0], this[1] % other[1]);
     }
     Vec2.prototype.abs = function(){
        return new Vec2(Math.abs(this[0]), Math.abs(this[1]));
     }
     Vec2.prototype.xy = function(vec2OrX,y){
        if(arguments.length == 0)
            return this;
        else{
            return getVec2(vec2OrX, y);
        }
     }
     Vec2.prototype.x = function(x){
        if(arguments.length == 0)
            return this[0];
        else
            return this.xy(x, this[1]);
     }
     Vec2.prototype.y = function(y){
        if(arguments.length == 0)
            return this[1];
        else
            return this.xy(this[0], y);
     }



    /**
     * The virtual Vec3 type
     * @constructor
     */
     var Vec3 = function(vec3OrVec2OrX, yOrZ, z ){
        if(vec3OrVec2OrX instanceof Vec3){
            this[0] = vec3OrVec2OrX[0];
            this[1] = vec3OrVec2OrX[1];
            this[2] = vec3OrVec2OrX[2];
        }
        else if(vec3OrVec2OrX instanceof Vec2){
            this[0] = vec3OrVec2OrX[0];
            this[1] = vec3OrVec2OrX[1];
            this[2] = yOrZ || 0;
        }
        else{
            this[0] = vec3OrVec2OrX || 0;
            this[1] = yOrZ !== undefined ? yOrZ : this[0];
            this[2] = yOrZ !== undefined ? z : this[0];
        }
     }

     function getVec3(vec3OrVec2OrX, yOrZ, z){
        if(vec3OrVec2OrX instanceof Vec3)
            return vec3OrVec2OrX
        return new Vec3(vec3OrVec2OrX, yOrZ, z);
     }

     Vec3.prototype.add = function(vec3OrVec2OrX, yOrZ, z){
        var other = getVec3(vec3OrVec2OrX, yOrZ, z);
        return new Vec3(this[0] + other[0], this[1] + other[1], this[2] + other[2]);
     }
     Vec3.prototype.sub = function(vec3OrVec2OrX, yOrZ, z){
        var other = getVec3(vec3OrVec2OrX, yOrZ, z);
        return new Vec3(this[0] - other[0], this[1] - other[1], this[2] - other[2]);
     }
     Vec3.prototype.mul = function(vec3OrVec2OrX, yOrZ, z){
        var other = getVec3(vec3OrVec2OrX, yOrZ, z);
        return new Vec3(this[0] * other[0], this[1] * other[1], this[2] * other[2]);
     }
     Vec3.prototype.div = function(vec3OrVec2OrX, yOrZ, z){
        var other = getVec3(vec3OrVec2OrX, yOrZ, z);
        return new Vec3(this[0] / other[0], this[1] / other[1], this[2] / other[2]);
     }
     Vec3.prototype.mod = function(vec3OrVec2OrX, yOrZ, z){
        var other = getVec3(vec3OrVec2OrX, yOrZ, z);
        return new Vec3(this[0] % other[0], this[1] % other[1], this[2] % other[2]);
     }
     Vec3.prototype.abs = function(){
        return new Vec3(Math.abs(this[0]), Math.abs(this[1]), Math.abs(this[2]));
     }
     Vec3.prototype.xyz = function(vec3OrVec2OrX, yOrZ, z){
        if(arguments.length == 0)
            return this;
        else
            return getVec3(vec3OrVec2OrX, yOrZ, z);
     }
     Vec3.prototype.x = function(x){
        if(arguments.length == 0)
            return this[0];
        else
            return this.xyz(x, this[1], this[2]);
     }
     Vec3.prototype.y = function(y){
        if(arguments.length == 0)
            return this[1];
        else
            return this.xyz(this[0], y, this[2]);
     }

     Vec3.prototype.xy = function(vec2OrX,y){
        if(arguments.length == 0)
            return new Vec2(this[0], this[1]);
        else{
            var other = getVec2(vec2OrX,y);
            return this.xyz(other[0], other[1], this[2]);
        }
     }
     Vec3.prototype.yz = function(vec2OrX,y){
        if(arguments.length == 0)
            return new Vec2(this[1], this[2]);
        else{
            var other = getVec2(vec2OrX,y);
            return this.xyz(this[0], other[0], other[1]);
        }
     }
     Vec3.prototype.xz = function(vec2OrX,y){
        if(arguments.length == 0)
            return new Vec2(this[0], this[2]);
        else{
            var other = getVec2(vec2OrX,y);
            return this.xyz(other[0], this[1], other[1]);
        }
     }




    /**
     * The virtual Normal type
     * @interface
     */
    var Normal = function () {
    };


    /**
     * Static function that  normalizes the
     * given normal in place and returns it
     *
     * @param {Normal} n
     * @returns {Normal}
     */
    Normal.normalize = function(n) {
        var length = Math.sqrt(n.x * n.x+ n.y * n.y+ n.z * n.z);
        if(!length)
            return n;
        n.x = n.x / length;
        n.y = n.y / length;
        n.z = n.z / length;
    };

    /**
     * The virtual Color type
     * @interface
     */
    var Color = function() {

    };

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

}(exports));

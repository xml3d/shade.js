(function (ns) {

    ns.extend = function(dest){
        var vec2 = dest.vec2;
        var vec3 = dest.vec3;
        var vec4 = dest.vec4;
        var mat2 = dest.mat2;
        var mat3 = dest.mat3;
        var mat4 = dest.mat4;

        vec2.setLength = function(dest, a, b){
            var length = vec2.length(a);
            if(!length) return;
            vec2.scale(dest, a, b / length);
        };
        vec3.setLength = function(dest, a, b){
            var length = vec3.length(a);
            if(!length) return;
            vec3.scale(dest, a, b / length);
        };
        vec4.setLength = function(dest, a, b){
            var length = vec4.length(a);
            if(!length) return;
            vec4.scale(dest, a, b / length);
        };


        vec2.copyArray = function(dest, array, i){
            var off = 2*i;
            vec2.set(dest, array[off], array[off+1]);
        };
        vec3.copyArray = function(dest, array, i){
            var off = 3*i;
            vec3.set(dest, array[off], array[off+1], array[off+2]);
        };
        vec4.copyArray = function(dest, array, i){
            var off = 4*i;
            vec4.set(dest, array[off], array[off+1], array[off+2], array[off+3]);
        };
        mat3.copyArray = function(dest, array, i){
            var j = 9;
            var off = j*i;
            while(j--){
                dest[j] = array[off+j];
            }
        };
        mat4.copyArray = function(dest, array, i){
            var j = 16;
            var off = j*i;
            while(j--){
                dest[j] = array[off+j];
            }
        };
        vec2.pasteArray = function(dest, i, value){
            var off = 2*i;
            dest[off] = value[0];
            dest[off+1] = value[1];
        };
        vec3.pasteArray = function(dest, i, value){
            var off = 3*i;
            dest[off] = value[0];
            dest[off+1] = value[1];
            dest[off+2] = value[2];
        };
        vec4.pasteArray = function(dest, i, value){
            var off = 3*i;
            dest[off] = value[0];
            dest[off+1] = value[1];
            dest[off+2] = value[2];
            dest[off+3] = value[3];
        };
        mat3.pasteArray = function(dest, i, value){
            var j = 9;
            var off = j*i;
            while(j--){
                dest[off+j] = value[j];
            }
        };
        mat4.pasteArray = function(dest, i, value){
            var j = 16;
            var off = j*i;
            while(j--){
                dest[off+j] = value[j];
            }
        };
    };

}(exports));

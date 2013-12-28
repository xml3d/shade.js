(function(ns){

    var OneParameterNumberMethods = ["acos", "asin", "atan", "cos", "exp", "log", "round", "sin", "sqrt", "tan", "ceil", "floor"];

    function oneParameterFunction(name) {

        var func = Math[name];

        return function(vec) {
            var length = vec.length,
                result = new Float32Array(length);
            while(length--) {
                result[length] = func(vec[length]);
            }
            return result;
        }
    }

    var VecMath = {
        mix : function(x,y,a) {
            var length = x.length,
                result = new Float32Array(length),
                oneMinusA;

            if (Array.isArray(a) && a.length >= length) {
                while(length--) {
                    var a = a[length];
                    result[length] = x[length] * (1 - a) + y[length] * a;
                }
            } else {
                oneMinusA = 1 - a;
                while(length--) {
                    result[length] = x[length] * oneMinusA + y[length] * a;
                }
            }
            return result;

        },
        step : function(edge, x) {
            var length = edge.length,
                result = new Float32Array(length);

            while(length--) {
                var e = edge[length];
                var x0 = x[length];
                result[length] = (x0 <= e) ? 0 : 1;
            }
            return result;
        },
        smoothstep : function(edge0, edge1, x) {
            var length = edge0.length,
                result = new Float32Array(length);

            while(length--) {
                var e0 = edge0[length];
                var e1 = edge1[length];
                var x0 = x[length];
                var t = Math.clamp((x0 - e0) / (e1 - e0), 0.0, 1.0);
                result[length] = t * t * (3.0 - 2.0 * t);
            }
            return result;
        }
    };

    OneParameterNumberMethods.forEach(function(name) {
        VecMath[name] = oneParameterFunction(name);
    });

    ns.VecMath = VecMath;


}(exports));

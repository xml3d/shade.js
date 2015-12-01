var Shade = require(".."),
    expect = require('should'),
    codegen = require("escodegen"),
    SimpleStatement = require("../src/generate/simple-statement/simple-statement.js");

var wrapFunction = function(str, argsString){
    return 'function main('+ argsString + '){' + str + '}';
}

var getSimplifiedCode = function (str, args) {
    args = args || { a : "Vec3", "b" : "Vec3", "c": "Vec3", "d" : "Vec3"};
    var argNames = [], argTypes = [];
    for(var name in args){
        argNames.push(name);
        if(typeof args[name] == "object")
            argTypes.push({ "extra" : args[name]});
        else
            argTypes.push({ "extra": { "type": "object", "kind": args[name] } })
    }
    var argsString = argNames.join(",");
    str = wrapFunction(str, argsString);

    var aast = Shade.parseAndInferenceExpression(str,
        {entry: "global.main", throwOnError: true, validate: true, sanitize: true,
        inject: { "global.main": argTypes } });
    aast = SimpleStatement.simplifyStatements(aast);
    var code = codegen.generate(aast, {
        format: {
            compact: true
        }
    });
    var result = code.match(/function main\([^)]+\)\{(.+)\}/);
    return result && result[1];
}


var checkSimplified = function( code, sanitizedCode, args){
    if(typeof sanitizedCode == "string"){
        var sCode = getSimplifiedCode(code, args);
        sCode.should.equal(sanitizedCode);
    }
};


xdescribe('Statement Simplifier:', function () {
    it("should handle basic nested vec3 operators", function () {
        checkSimplified("var res = a.add(b).mul(c)",
                        "var res,_vec3Tmp0;_vec3Tmp0=a.add(b);res=_vec3Tmp0.mul(c);");
    });
    it("should handle complex nested vec3 operators", function () {
        checkSimplified("var res = a.add(b.sub(c)).mul(a.div(d))",
                        "var res,_vec3Tmp0,_vec3Tmp1;_vec3Tmp0=b.sub(c);_vec3Tmp0=a.add(_vec3Tmp0);_vec3Tmp1=a.div(d);res=_vec3Tmp0.mul(_vec3Tmp1);");
    });
    it("should handle linearly nested statements with a single temp variable", function () {
        checkSimplified("var res = a.add(a).add(a).add(a).add(a).add(a).add(a)",
                        "var res,_vec3Tmp0;_vec3Tmp0=a.add(a);_vec3Tmp0=_vec3Tmp0.add(a);_vec3Tmp0=_vec3Tmp0.add(a);_vec3Tmp0=_vec3Tmp0.add(a);_vec3Tmp0=_vec3Tmp0.add(a);res=_vec3Tmp0.add(a);");
    });
    it("should ignore scalar output vec3 operators", function () {
        checkSimplified("var dot = a.dot(b) * b.dot(c);",
                        "var dot;dot=a.dot(b)*b.dot(c);");
    });
    it("should handle vec3 output methodes within scalar output methods", function () {
        checkSimplified("var dot = a.dot(b.cross(c))",
                        "var dot,_vec3Tmp0;_vec3Tmp0=b.cross(c);dot=a.dot(_vec3Tmp0);");
    });
    it("should handle vec3 methodes within if statements", function () {
        checkSimplified("var res; if( a.dot(b.mul(c)) > 0.5 ) res = a.div(d); else res = a.mul(d);",
                        "var res,_vec3Tmp0;_vec3Tmp0=b.mul(c);if(a.dot(_vec3Tmp0)>0.5)res=a.div(d);else res=a.mul(d);");
    });
    it("should handle vec3 methodes within while statements", function () {
        checkSimplified("var res = a;while( res.dot(b.mul(c)) > 0.5 ){ res = res.div(d); }",
                        "var res,_vec3Tmp0;res=a;_vec3Tmp0=b.mul(c);while(res.dot(_vec3Tmp0)>0.5){res=res.div(d);_vec3Tmp0=b.mul(c);}");
    });
    it("should handle vec3 methodes within do while statements", function () {
        checkSimplified("var res = a;do{ res = res.div(d); } while( res.dot(b.mul(c)) > 0.5 );",
                        "var res,_vec3Tmp0;res=a;do{res=res.div(d);_vec3Tmp0=b.mul(c);}while(res.dot(_vec3Tmp0)>0.5);");
    });
    it("should handle vec3 methodes within for statements", function () {
        checkSimplified("var res = a;for(var t = new Vec3(2); t.dot(b.mul(c)) > 0.5; t = t.div(d) ){ res = res.mul(d) }",
                        "var res,t,_vec3Tmp0;res=a;t=new Vec3(2);_vec3Tmp0=b.mul(c);for(;t.dot(_vec3Tmp0)>0.5;){res=res.mul(d);t=t.div(d);_vec3Tmp0=b.mul(c);}");
    });

    it("should handle nested staements inside return statements", function () {
        checkSimplified("return a.add(b).mul(c)",
                        "var _vec3Tmp0;_vec3Tmp0=a.add(b);_vec3Tmp0=_vec3Tmp0.mul(c);return _vec3Tmp0;");
    });

    it("should avoid writing to function arguments", function () {
        checkSimplified("a = b;",
                        "var _dest_a;_dest_a=a;_dest_a=b;");
    });
    it("should avoid writing to function arguments and replace all reads with a new variable", function () {
        checkSimplified("var tmp = a.mul(d); a = b.mul(tmp);",
                        "var tmp,_dest_a;_dest_a=a;tmp=_dest_a.mul(d);_dest_a=b.mul(tmp);");
    });
    it("should correctly handle writes to function arguments in while loop", function () {
        checkSimplified("while(a.length() > 1){a = a.mul(d)}",
                        "var _dest_a;_dest_a=a;while(_dest_a.length()>1){_dest_a=_dest_a.mul(d);}");
    });

    it("should handle vec3 construction within statements", function () {
        checkSimplified("var res = new Vec3(1).mul(new Vec3(2).add(a))",
                        "var res,_vec3Tmp0,_vec3Tmp1;_vec3Tmp0=new Vec3(1);_vec3Tmp1=new Vec3(2);_vec3Tmp1=_vec3Tmp1.add(a);res=_vec3Tmp0.mul(_vec3Tmp1);");
    });

    it("should correctly handle scalar arguments in vec3 mul and div", function() {
        checkSimplified("var res = a.mul(2).div(0.5)",
            "var res,_vec3Tmp0,_vec3Tmp1;_vec3Tmp0=new Vec3(2);_vec3Tmp0=a.mul(_vec3Tmp0);_vec3Tmp1=new Vec3(0.5);res=_vec3Tmp0.div(_vec3Tmp1);");
    });
    it("should correctly handle scalar arguments in vec3 add and sub", function() {
        checkSimplified("var res = a.add(2).sub(0.5)",
            "var res,_vec3Tmp0,_vec3Tmp1;_vec3Tmp0=new Vec3(2);_vec3Tmp0=a.add(_vec3Tmp0);_vec3Tmp1=new Vec3(0.5);res=_vec3Tmp0.sub(_vec3Tmp1);");
    });
    it("should correctly handle scalar arguments in vec3 cross and reflect", function() {
        checkSimplified("var res = a.cross(2).reflect(0.5)",
            "var res,_vec3Tmp0,_vec3Tmp1;_vec3Tmp0=new Vec3(2);_vec3Tmp0=a.cross(_vec3Tmp0);_vec3Tmp1=new Vec3(0.5);res=_vec3Tmp0.reflect(_vec3Tmp1);");
    });
    it("should correctly handle scalar arguments in vec3 dot and mod", function() {
        checkSimplified("var res = a.mod(5).dot(2);",
            "var res,_vec3Tmp0,_vec3Tmp1;_vec3Tmp0=new Vec3(5);_vec3Tmp0=a.mod(_vec3Tmp0);_vec3Tmp1=new Vec3(2);res=_vec3Tmp0.dot(_vec3Tmp1);");
    });


    it("should correctly handle scalars for vec2", function() {
        checkSimplified("var res = a.mul(4).div(4)",
            "var res,_vec2Tmp0,_vec2Tmp1;_vec2Tmp0=new Vec2(4);_vec2Tmp0=a.mul(_vec2Tmp0);_vec2Tmp1=new Vec2(4);res=_vec2Tmp0.div(_vec2Tmp1);",
            {"a" : "float2"});
    });
    it("should correctly handle scalars for vec4", function() {
        checkSimplified("var res = a.mul(4).div(4)",
            "var res,_vec4Tmp0,_vec4Tmp1;_vec4Tmp0=new Vec4(4);_vec4Tmp0=a.mul(_vec4Tmp0);_vec4Tmp1=new Vec4(4);res=_vec4Tmp0.div(_vec4Tmp1);",
            {"a" : "float4"});
    });
    it("should correctly handle scalars for Mat3", function() {
        checkSimplified("var res = a.mul(4).div(4)",
            "var res,_mat3Tmp0,_mat3Tmp1;_mat3Tmp0=new Mat3(4);_mat3Tmp0=a.mul(_mat3Tmp0);_mat3Tmp1=new Mat3(4);res=_mat3Tmp0.div(_mat3Tmp1);",
            {"a" : "matrix3"});
    });
    it("should correctly handle scalars for Mat4", function() {
        checkSimplified("var res = a.mul(4).div(4)",
            "var res,_mat4Tmp0,_mat4Tmp1;_mat4Tmp0=new Mat4(4);_mat4Tmp0=a.mul(_mat4Tmp0);_mat4Tmp1=new Mat4(4);res=_mat4Tmp0.div(_mat4Tmp1);",
            {"a" : "matrix4"});
    });

    it("should correctly handle strange inputs for Vec4 methods", function() {
        checkSimplified("var res = a.mul(4, b).div(c, c).add(1, c, 2)",
            "var res,_vec4Tmp0,_vec4Tmp1;_vec4Tmp0=new Vec4(4,b);_vec4Tmp0=a.mul(_vec4Tmp0);_vec4Tmp1=new Vec4(c,c);_vec4Tmp0=_vec4Tmp0.div(_vec4Tmp1);_vec4Tmp1=new Vec4(1,c,2);res=_vec4Tmp0.add(_vec4Tmp1);",
            {"a" : "float4", "b" : "float3", "c" : "float2"});
    });

    it("should correctly handle the col method of mat3", function() {
        checkSimplified("var res = a.col(0,b).col(1,2).col(2, c, 4)",
            "var res,_mat3Tmp0,_vec3Tmp0;_mat3Tmp0=a.col(0,b);_vec3Tmp0=new Vec3(2);_mat3Tmp0=_mat3Tmp0.col(1,_vec3Tmp0);_vec3Tmp0=new Vec3(c,4);res=_mat3Tmp0.col(2,_vec3Tmp0);",
            {"a" : "matrix3", "b" : "float3", "c" : "float2" });

    });
    it("should correctly handle the col method of mat4", function() {
        checkSimplified("var res = a.col(0,b).col(1,2).col(2, c, c)",
            "var res,_mat4Tmp0,_vec4Tmp0;_mat4Tmp0=a.col(0,b);_vec4Tmp0=new Vec4(2);_mat4Tmp0=_mat4Tmp0.col(1,_vec4Tmp0);_vec4Tmp0=new Vec4(c,c);res=_mat4Tmp0.col(2,_vec4Tmp0);",
            {"a" : "matrix4", "b" : "float4", "c" : "float2" });

    });

    it("should do nothing in case of flip, normalize and empty length", function() {
        checkSimplified("var res = a.flip().normalize().length();",
            "var res,_vec3Tmp0;_vec3Tmp0=a.flip();_vec3Tmp0=_vec3Tmp0.normalize();res=_vec3Tmp0.length();");
    });

    it("should correctly handle temp variables in certain situations", function() {
        checkSimplified("var res = Math.min(b.dot(1,2,3),c.dot(1,2,3) )",
            "var res,_vec3Tmp0,_vec3Tmp1;_vec3Tmp0=new Vec3(1,2,3);_vec3Tmp1=new Vec3(1,2,3);res=Math.min(b.dot(_vec3Tmp0),c.dot(_vec3Tmp1));");
    });

    it("should correctly handle array access", function() {
        checkSimplified("var res = a[0];",
            "var res;res=a[0];",
            {"a" : {type: "array", elements: {type : "object", kind: "float3"}}});
    });
    it("should correctly handle nested array access", function() {
        checkSimplified("var res = a[0].mul(a[1]);",
            "var res,_vec3Tmp0,_vec3Tmp1;_vec3Tmp0=a[0];_vec3Tmp1=a[1];res=_vec3Tmp0.mul(_vec3Tmp1);",
            {"a" : {type: "array", elements: {type : "object", kind: "float3"}}});
    });
    it("should correctly handle array write", function() {
        checkSimplified("a[0] = b.mul(2);",
            "var _vec3Tmp0;_vec3Tmp0=new Vec3(2);_vec3Tmp0=b.mul(_vec3Tmp0);a[0]=_vec3Tmp0;",
            {"a" : {type: "array", elements: {type : "object", kind: "float3"}}, "b" : "float3"});
    });

    it("should correctly convert reading swizzles", function() {
        checkSimplified("var res = a.zxx()",
            "var res;res=new Vec3(a.z(),a.x(),a.x());");
    });
    it("should correctly convert reading swizzles with scalar output", function() {
        checkSimplified("var res = a.r()",
            "var res;res=a.x();");
    });
    it("should correctly convert writing swizzles", function() {
        checkSimplified("var res = a.zx(2,5)",
            "var res,_vec2Tmp0;_vec2Tmp0=new Vec2(2,5);res=new Vec3(_vec2Tmp0.y(),a.y(),_vec2Tmp0.x());");
    });
    it("should correctly convert writing swizzles with operators", function() {
        checkSimplified("var res = a.yzAdd(4,7)",
            "var res,_vec2Tmp0;_vec2Tmp0=new Vec2(4,7);res=new Vec3(a.x(),a.y()+_vec2Tmp0.x(),a.z()+_vec2Tmp0.y());");
    });
    it("should correctly convert writing swizzles with operators and scalar input", function() {
        checkSimplified("var res = a.xAdd(5)",
            "var res;res=new Vec3(a.x()+5,a.y(),a.z());");
    });

});

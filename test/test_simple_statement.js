var Shade = require(".."),
    expect = require('should'),
    codegen = require("escodegen"),
    SimpleStatement = require("../src/generate/simple-statement/simple-statement.js");

var wrapFunction = function(str){
    return 'function main(a,b,c,d){' + str + '}';
}

var getSimplifiedCode = function (str, ctx) {
    str = wrapFunction(str);
    var aast = Shade.parseAndInferenceExpression(str,
    {entry: "global.main", throwOnError: true, validate: true, sanitize: true,
        inject: { "global.main": [
                    { "extra": { "type": "object", "kind": "float3" } },
                    { "extra": { "type": "object", "kind": "float3" } },
                    { "extra": { "type": "object", "kind": "float3" } },
                    { "extra": { "type": "object", "kind": "float3" } }]
                } });
    aast = SimpleStatement.simplifyStatements(aast);
    var code = codegen.generate(aast, {
        format: {
            compact: true
        }
    });
    var result = code.match(/function main\(a,b,c,d\)\{(.+)\}/);
    return result && result[1];
}


var checkSimplified = function( code, sanitizedCode){
    if(typeof sanitizedCode == "string"){
        var sCode = getSimplifiedCode(code);
        sCode.should.equal(sanitizedCode);
    }
};


describe.only('Statement Simplifier:', function () {
    it("should handle basic nested vec3 operators", function () {
        checkSimplified("var res = a.add(b).mul(2)",
                        "var res,_vec3Tmp0;_vec3Tmp0=a.add(b);res=_vec3Tmp0.mul(2);");
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
        checkSimplified("var res; if( a.dot(b.mul(c)) > 0.5 ) res = a.div(2); else res = a.mul(2);",
                        "var res,_vec3Tmp0;_vec3Tmp0=b.mul(c);if(a.dot(_vec3Tmp0)>0.5)res=a.div(2);else res=a.mul(2);");
    });
    it("should handle vec3 methodes within while statements", function () {
        checkSimplified("var res = a;while( res.dot(b.mul(c)) > 0.5 ){ res = res.div(2); }",
                        "var res,_vec3Tmp0;res=a;_vec3Tmp0=b.mul(c);while(res.dot(_vec3Tmp0)>0.5){res=res.div(2);_vec3Tmp0=b.mul(c);}");
    });
    it("should handle vec3 methodes within do while statements", function () {
        checkSimplified("var res = a;do{ res = res.div(2); } while( res.dot(b.mul(c)) > 0.5 );",
                        "var res,_vec3Tmp0;res=a;do{res=res.div(2);_vec3Tmp0=b.mul(c);}while(res.dot(_vec3Tmp0)>0.5);");
    });
    it("should handle vec3 methodes within for statements", function () {
        checkSimplified("var res = a;for(var t = new Vec3(2); t.dot(b.mul(c)) > 0.5; t = t.div(2) ){ res = res.mul(2) }",
                        "var res,t,_vec3Tmp0;res=a;t=new Vec3(2);_vec3Tmp0=b.mul(c);for(;t.dot(_vec3Tmp0)>0.5;){res=res.mul(2);t=t.div(2);_vec3Tmp0=b.mul(c);}");
    });
    it("should handle vec3 methodes within for statements", function () {
        checkSimplified("var res = a;for(var t = new Vec3(2); t.dot(b.mul(c)) > 0.5; t = t.div(2) ){ res = res.mul(2) }",
                        "var res,t,_vec3Tmp0;res=a;t=new Vec3(2);_vec3Tmp0=b.mul(c);for(;t.dot(_vec3Tmp0)>0.5;){res=res.mul(2);t=t.div(2);_vec3Tmp0=b.mul(c);}");
    });
    it("should avoid writing to function arguments", function () {
        checkSimplified("a = b;",
                        "var _dest_a;_dest_a=a;_dest_a=b;");
    });
    it("should avoid writing to function arguments and replace all reads with a new variable", function () {
        checkSimplified("var tmp = a.mul(2); a = b.mul(tmp);",
                        "var tmp,_dest_a;_dest_a=a;tmp=_dest_a.mul(2);_dest_a=b.mul(tmp);");
    });
    it("should correctly handle writes to function arguments in while loop", function () {
        checkSimplified("while(a.length() > 1){a = a.mul(0.9)}",
                        "var _dest_a;_dest_a=a;while(_dest_a.length()>1){_dest_a=_dest_a.mul(0.9);}");
    });

});

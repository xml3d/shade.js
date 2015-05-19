(function (ns) {
	
    var Base = require("../../base/index.js");
	
    var SnippetConverter = function(){

    } 

	Base.extend(SnippetConverter.prototype,{
			excludeEnv:function(snippetAst,params){
				for (obj in snippetAst){
					if (snippetAst[obj] && (typeof (snippetAst[obj]) == 'object' || Array.isArray(snippetAst[obj])))
						if (snippetAst[obj]["type"]!= "MemberExpression"){
							this.excludeEnv(snippetAst[obj],params);
							}
						else{
							if (snippetAst[obj]["object"]["name"]== "env"){
								params.push(snippetAst[obj]["property"]["name"]);
								snippetAst[obj] = snippetAst[obj]["property"];
							}
							this.excludeEnv(snippetAst[obj],params);
						}
			
				}
			},
		
		
		convertShaderToSnippedAst : function(fullAst){
		    var duplicatedParams = [];
		    this.excludeEnv(fullAst,duplicatedParams);
		    
		    
		    //deleting the duplicated parameters		    
		    for (var i = 0; i < duplicatedParams.length; i++){
		    	var index=duplicatedParams.indexOf(duplicatedParams[i],i+1);
		    	if (index)
		    		duplicatedParams.splice(index,1);
		    }
		    
		    fullAst["params"]=[];
		    for (i in duplicatedParams){
		    	fullAst["params"].push({"name":duplicatedParams[i],"type":"Identifier"})
		    }

		    return fullAst;
		}
	});
	
	ns.SnippetConverter = SnippetConverter;


}(exports));

// Connection of Morph Snippets
snippets = {
    morph : function(value, valueAdd, weight) {
        return value.add(valueAdd.mul(weight));
    },
    vsConnect : function(position, normal){
        return {
            "position" : this.modelViewMatrix.mulVec(position),
            "normal" : this.modelViewMatrixN.mulVec(normal),
            "_glPosition" : this.modelViewProjectionMatrix.mulVec(position)
        }
    }
}
/*
[
    {
        "code": "morph",
        "input": [
            { "type": {"type": "object", "kind" : "float3" },
              "iterate" : true, "arrayAccess": false,  "directInputIndex" : 0 },
            { "type": {"type": "object", "kind" : "float3" },
              "iterate" : true, "arrayAccess": false,  "directInputIndex" : 1 },
            { "type": {"type": "number"},
              "iterate" : false, "arrayAccess": false,  "directInputIndex" : 2 }
        ],
        "output" : [
            {   "type" : {"type": "object", "kind" : "float3" }, "name" : "result"}
        ]
    },
    {
        "code": "vsConnect",
        "input": [
            { "type": {"type": "object", "kind" : "float3" },
              "iterate" : true, "arrayAccess": false,  "transferOperator" : 0,  "transferOutput" : 0  },
            { "type": {"type": "object", "kind" : "float3" },
              "iterate" : true, "arrayAccess": false,  "directInputIndex" : 3 }
        ],
        "output" : [
            {   "type" : {"type": "object", "kind" : "float3" }, "name" : "position", "finalOutputIndex": 0 },
            {   "type" : {"type": "object", "kind" : "float3" }, "name" : "normal", "finalOutputIndex": 1 }
        ]
    }
]
*/
{
    function main_js(position, normal, value, valueAdd, weight, normal_2, maxIter) {
        var result;
        var i = maxIter;
        while (i--) {
            result = value[i].add(valueAdd[i].mul(weight[0]));
            {
                position[i] = this.modelViewMatrix.mulVec(result);
                normal[i] = this.modelViewMatrixN.mulVec(normal_2[i]);
            }

        }
    }
}
/*
    {
        "argTypes" : [
            { "extra" : { "type" : "array", "elements" : { "type" : "object", "kind" : "float3" } }},
            { "extra" : { "type" : "array", "elements" : { "type" : "object", "kind" : "float3" } }},
            { "extra" : { "type" : "array", "elements" : { "type" : "object", "kind" : "float3" } }},
            { "extra" : { "type" : "array", "elements" : { "type" : "object", "kind" : "float3" } }},
            { "extra" : { "type" : "array", "elements" : { "type" : "number" } }},
            { "extra" : { "type" : "array", "elements" : { "type" : "object", "kind" : "float3" } }},
            { "extra" : { "type" : "int" }}
        ]
    }
 */
{
    function main_glsl(env) {
        var result;
        result = env.value.add(env.valueAdd.mul(env.weight));
        {
            env.position = this.modelViewMatrix.mulVec(result);
            env.normal = this.modelViewMatrixN.mulVec(env.normal_2);
            return this.modelViewProjectionMatrix.mulVec(result);
        }

    }
}
/*
    {
        "argTypes" : [
            { "extra" : {
                    "type": "object", "kind": "any", "global": true,
                    "info": {
                        "position": { "type": "object", "kind": "float3", "source": "vertex", "output": true },
                        "normal_2": { "type": "object", "kind": "float3", "source": "vertex" },
                        "normal": { "type": "object", "kind": "float3", "source": "vertex", "output": true },
                        "value": { "type": "object", "kind": "float3", "source": "vertex" },
                        "valueAdd": { "type": "object", "kind": "float3", "source": "vertex" },
                        "weight": { "type": "number", "source": "uniform" }
                    }
                }
            }
        ],
        "inputIndices" : {
            "normal_2": 3,
            "value": 0,
            "valueAdd": 1,
            "weight": 2
        }
    }
 */


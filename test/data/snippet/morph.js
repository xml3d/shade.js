// Connection of Morph Snippets
snippets = {
    morph : function(value, valueAdd, weight) {
        return value.add(valueAdd.mul(weight));
    }
}
/*
[
    {
        "code": "morph",
        "input": [
            { "type": {"type": "object", "kind" : "float3" },
              "iterate" : true, "directInputIndex" : 0 },
            { "type": {"type": "object", "kind" : "float3" },
              "iterate" : true,  "directInputIndex" : 1 },
            { "type": {"type": "number"},
              "iterate" : false, "directInputIndex" : 2 }
        ],
        "output" : [
            {   "type" : {"type": "object", "kind" : "float3" }, "name" : "result"}
        ]
    },
    {
        "code": "morph",
        "input": [
            { "type": {"type": "object", "kind" : "float3" },
              "iterate" : true,  "transferOperator" : 0,  "transferOutput" : 0  },
            { "type": {"type": "object", "kind" : "float3" },
              "iterate" : true, "directInputIndex" : 3 },
            { "type": {"type": "number"},
              "iterate" : false, "directInputIndex" : 4 }
        ],
        "output" : [
            {   "type" : {"type": "object", "kind" : "float3" }, "name" : "result", "finalOutputIndex": 0 }
        ]
    }
]
*/
{
    function main_js(result, value, valueAdd, weight, valueAdd_2, weight_2, maxIter) {
        var result_2;
        var i = maxIter;
        while (i--) {
            result_2 = value[i].add(valueAdd[i].mul(weight[0]));
            result[i] = result_2.add(valueAdd_2[i].mul(weight_2[0]));
        }
    }
}
/*
    {
        "argTypes" : [
            { "extra" : { "type" : "array", "elements" : { "type" : "object", "kind" : "float3" } }},
            { "extra" : { "type" : "array", "elements" : { "type" : "object", "kind" : "float3" } }},
            { "extra" : { "type" : "array", "elements" : { "type" : "object", "kind" : "float3" } }},
            { "extra" : { "type" : "array", "elements" : { "type" : "number" } }},
            { "extra" : { "type" : "array", "elements" : { "type" : "object", "kind" : "float3" } }},
            { "extra" : { "type" : "array", "elements" : { "type" : "number" } }},
            { "extra" : { "type" : "int" }}
        ]
    }
 */
{
    function main_glsl(env) {
        var result_2;
        result_2 = env.value.add(env.valueAdd.mul(env.weight));
        env.result = result_2.add(env.valueAdd_2.mul(env.weight_2));

    }
}
/*
    {
        "argTypes" : [
            { "extra" : {
                    "type": "object", "kind": "any", "global": true,
                    "info": {
                        "result": { "type": "object", "kind": "float3", "source": "vertex", "output": true },
                        "value": { "type": "object", "kind": "float3", "source": "vertex" },
                        "valueAdd": { "type": "object", "kind": "float3", "source": "vertex" },
                        "weight": { "type": "number", "source": "uniform" },
                        "valueAdd_2": { "type": "object", "kind": "float3", "source": "vertex" },
                        "weight_2": { "type": "number", "source": "uniform" }
                    }
                }
            }
        ],
        "inputIndices" : {
            "value" : 0,
            "valueAdd" : 1,
            "weight" : 2,
            "valueAdd_2" : 3,
            "weight_2" : 4
        }
    }
 */


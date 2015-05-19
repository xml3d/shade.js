## Annotations

Annotation to the AST are stored in a property called _extra_. Every kind of AST node should be annotated except of _Identifier_.

### Annotation

    interface Annotation {
      type: string,
      staticValue: {*}
    }

The type __field__ is a string representing the type of the AST node. The value __field__ is one of:

    enum ShadeTypes {
        "any" || "int" || "number" || "boolean" || "object" ||  "array" || "null" || "undefined" || "function" || "string"
    }

The (optional) _staticValue_ property contains a static value with the type defined by the annotation.


### ObjectAnnotation

    interface ObjectAnnotation  <: Annotation {
      type: "object",
      kind: string
    }

Nodes that are annotated to be of type _object_, have an additional property called __kind__. The value __kind__ is one of:

    enum ShadeObjectKinds {
          "any" || "float2" || "float3" || "float4" || "normal" || "matrix4" || "matrix3" || "texture" || "color_closure"
    }

### AnyObjectAnnotation

    interface AnyObjectAnnotation  <: ObjectAnnotation {
      type: "object",
      kind: "any",
      properties: Object.<string,Annotation>
    }

A structured object with a list of defined __properties__. The __properties__ object maps from name to an Annotation object.

### FunctionAnnotation

### ArrayAnnotation

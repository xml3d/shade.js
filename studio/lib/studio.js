(function (ns) {

    var TYPE_LIST = {};

    var ShadeStudio = function() {
        this.paramList = [];
        this.paramForm = null;
    };

    ShadeStudio.prototype = {
        init: function() {
            initTypeList();
            this.javaScriptEditor = CodeMirror.fromTextArea(document.querySelector("textarea"), {
                mode: "javascript",
                lineNumbers: true

            });
            this.javaScriptEditor.on("change", this.onEdit.bind(this));
            this.codeViewer = CodeMirror(document.querySelector(".codeOutput"), {
                value: "",
                mode:  "x-shader/x-fragment",
                readOnly: true
            });
            this.paramForm = document.getElementById("paramList");

        },
        onEdit: function(instance, obj) {
            var newValue = instance.getValue();
            try {
                var params = Shade.extractParameters(newValue);
                console.log(params);
                this.updateParameterSelection(params);
                this.updateOutput();
            } catch (e) {
                console.log(e.toString());
            }
        },
        updateParameterSelection: function(params){
            if(this.paramList.join("j") == params.join(";"))
                return;
            this.paramList = params;

            var newSelects = {};
            for(var i = 0; i < params.length; ++i){
                var paramName = params[i];
                var oldField = this.paramForm.elements[paramName];
                newSelects[paramName] = createParamSelect(paramName, oldField && oldField.value);
            }
            var list = $("#inputList");
            list.empty();
            for(var name in newSelects){
                var listEntry = $('<li><label for="' + name +'">' + name +'</label></li>');
                listEntry.append(newSelects[name]);
                list.append(listEntry);
            }
        },
        updateOutput: function(){
            var contextData = {
                "global.shade" : [
                    {}
                ]
            }
            for(var i = 0; i < this.paramList.length; ++i){
                var name = this.paramList[i];
                contextData["global.shade"][0][name] = TYPE_LIST[this.paramForm.elements[name].value];
            }
            var code = this.javaScriptEditor.getValue();

            var aast = Shade.parseAndInferenceExpression(code, contextData);
            var result = Shade.compileFragmentShader(aast);

            this.codeViewer.setValue(result);
        }
    }

    function createParamSelect(selectName, selectedValue){
        var select = $("<select></select>");
        for(var name in TYPE_LIST){
            select.append($("<option>" + name + "</option>"));
        }
        select[0].name = selectName;
        select[0].value = selectedValue;
        select.change(function(){
            ns.ShadeStudio.updateOutput();
        });
        return select;
    }


    function initTypeList(){
        for(var name in Shade.TYPES){
            if(name != "OBJECT"){
                TYPE_LIST[name] = { type: Shade.TYPES[name], kind: undefined};
            }
        }
        for(var name in Shade.OBJECT_KINDS){
            var objName = "OBJECT_" + name;
            TYPE_LIST[objName] = { type: Shade.TYPES.OBJECT, kind: Shade.OBJECT_KINDS[name]};
        }
    }




    ns.ShadeStudio = new ShadeStudio();

}(window));

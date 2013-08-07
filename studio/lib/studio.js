(function (ns) {

    var TYPE_LIST = {};

    var ShadeStudio = function() {
        this.paramList = [];
        this.paramForm = null;
        this.console = null;
        this.lastErrorLine = undefined;
        this.storage = storageSupported() ? ns.localStorage : {};
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
            this.console = $("#console");

            if (this.storage.lastShaderCode !== undefined) {
                this.javaScriptEditor.setValue(this.storage.lastShaderCode);
            };

        },
        onEdit: function(instance, obj) {
            var newValue = this.javaScriptEditor.getValue();
            var codeCorrect = false;
            if(!isNaN(this.lastErrorLine)){
                this.javaScriptEditor.removeLineClass(this.lastErrorLine, 'background', 'line-error');
                this.lastErrorLine = undefined;
            }
            $("#main").removeClass("error");
            $("#main").removeClass("codeError");
            try {
                var params = Shade.extractParameters(newValue);
                console.log(params);
                codeCorrect = true;
                this.updateParameterSelection(params);
                this.updateOutput();
                this.storage.lastShaderCode = newValue;
            } catch (e) {
                console.log(e.toString());
                $("#main").addClass("error");
                if(!codeCorrect) $("#main").addClass("codeError");
                var lineNumber = e.lineNumber - 1;
                this.lastErrorLine = lineNumber;
                if(!isNaN(lineNumber))
                    this.javaScriptEditor.addLineClass(lineNumber, 'background', 'line-error');
                //this.javaScriptEditor.setLineClass(lineNumber, 'background', 'line-error');
                this.addConsoleText(e.toString(), true)
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
        },
        addConsoleText: function(text, error){
            var lastElement = this.console.find("li:last-child");
            var lastText = lastElement.find(".text").text();
            if(text == lastText){
                var counter = lastElement.find(".counter");
                if(counter.length){
                    var newCount = counter.text()*1 + 1;
                    counter.text(newCount);
                }
                else{
                    lastElement.append($('<span class="counter">2</span>'));
                }
                return;
            }
            var entry = $('<li><span class="text" >'+ text + '</span></li>');
            if(error) entry.addClass("error");
            this.console.append(entry);
            this.console[0].scrollTop = this.console[0].scrollHeight;
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
            ns.ShadeStudio.onEdit();
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

    function storageSupported() {
        try {
            return 'localStorage' in ns && ns['localStorage'] !== null;
        } catch (e) {
            return false;
        }
    }


    ns.ShadeStudio = new ShadeStudio();

}(window));

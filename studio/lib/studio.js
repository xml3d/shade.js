(function (ns) {

    var TYPE_LIST = {};

    var SOURCE_MAP = {},
        SOURCE_LIST = []

    var ShadeStudio = function() {
        this.paramList = [];
        this.paramForm = null;
        this.console = null;
        this.lastErrorLocation = null;
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
            if(this.lastErrorLocation && this.lastErrorLocation.start.line){
                this.javaScriptEditor.removeLineClass(this.lastErrorLocation.start.line -1, 'background', 'line-error');
                this.lastErrorLocation = null;
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
                console.log(e.loc);
                $("#main").addClass("error");
                if(!codeCorrect) $("#main").addClass("codeError");
                var errorLocation = e.loc || { start: { line: e.lineNumber }};
                this.lastErrorLocation = errorLocation;
                if(errorLocation.start.line)
                    this.javaScriptEditor.addLineClass(errorLocation.start.line - 1, 'background', 'line-error');
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
                var paramName = params[i], sourceName = "_" + paramName + "__source";
                var oldField = this.paramForm.elements[paramName],
                    oldSourceField = this.paramForm.elements[sourceName];
                newSelects[paramName] = createParamSelect(paramName,
                    oldField && oldField.value, oldSourceField && oldSourceField.value);
            }
            var list = $("#inputList");
            list.empty();
            for(var name in newSelects){
                list.append(newSelects[name]);
            }
        },
        updateOutput: function(){
            var contextData = {
                "global.shade" : [
                    { "_global" : true }
                ]
            }
            for(var i = 0; i < this.paramList.length; ++i){
                var name = this.paramList[i], sourceName = "_" + name + "__source";
                var src = TYPE_LIST[this.paramForm.elements[name].value];
                var dest = contextData["global.shade"][0][name] = {};
                for(var j in src){
                    dest[j] = src[j];
                }
                dest["source"] = SOURCE_MAP[this.paramForm.elements[sourceName].value];
            }
            var code = this.javaScriptEditor.getValue();

            var aast = Shade.parseAndInferenceExpression(code, { inject: contextData, loc: true });
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

    function createParamSelect(selectName, selectedValue, sourceValue){
        var listEntry = $('<li><label for="' + selectName +'">' + selectName +'</label></li>');

        var select = $("<select></select>");
        for(var name in TYPE_LIST){
            select.append($("<option>" + name + "</option>"));
        }
        select[0].name = selectName;
        select[0].value = selectedValue;
        select.change(function(){
            ns.ShadeStudio.onEdit();
        });
        listEntry.append(select);

        var sourceButton = $('<input class="sourceButton" type="button" name="_' + selectName + '__source" />');
        sourceButton[0].value = sourceValue || SOURCE_LIST[0];
        sourceButton.click(function(){
            var idx = SOURCE_LIST.indexOf(this.value);
            if(idx == -1 || idx == SOURCE_LIST.length - 1)
                this.value = SOURCE_LIST[0];
            else
                this.value = SOURCE_LIST[idx + 1];
        });
        listEntry.append(sourceButton);


        return listEntry;
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
        for(var name in Shade.SOURCES){
            var key = name.charAt(0).toUpperCase();
            SOURCE_MAP[key] = Shade.SOURCES[name];
            SOURCE_LIST.push(key);
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

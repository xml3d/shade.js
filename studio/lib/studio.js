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
        this.paramStateLoaded = false;
    };

    ShadeStudio.SystemParams = {
            "type": "object",
            "kind": "any",
            "info": {
                "coords": {
                    "type": "object",
                    "kind": "float3",
                    "source": "uniform"
                },
                "MAX_POINTLIGHTS": {
                    "type": "int",
                    "source": "constant",
                    "staticValue": 5
                },
                "pointLightOn": {
                    "type": "array",
                    "elements": {
                        "type": "boolean"
                    },
                    "staticSize": 5,
                    "source": "uniform"
                },
                "pointLightAttenuation": {
                    "type": "array",
                    "elements": {
                        "type": "object",
                        "kind": "float3"
                    },
                    "staticSize": 5,
                    "source": "uniform"
                },
                "pointLightIntensity": {
                    "type": "array",
                    "elements": {
                        "type": "object",
                        "kind": "float3"
                    },
                    "staticSize": 5,
                    "source": "uniform"
                },
                "viewMatrix": {
                    "type": "object",
                    "kind": "matrix3",
                    "source": "uniform"
                },
                "pointLightPosition": {
                    "type": "array",
                    "elements": {
                        "type": "object",
                        "kind": "float3"
                    },
                    "staticSize": 5,
                    "source": "uniform"
                }
            }
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
                lineNumbers: true
            });
            this.codeViewer.on("change", this.compileGL.bind(this));

            this.paramForm = document.getElementById("paramList");
            this.console = $("#console");

            if (this.storage.lastShaderCode !== undefined) {
                this.javaScriptEditor.setValue(this.storage.lastShaderCode);
            };
            try {
                this.gl = $(".theCanvas")[0].getContext("experimental-webgl");
                this.initGL();
                $(".theCanvas").mouseenter(this.setAnimate.bind(this, true))
                               .mouseleave(this.setAnimate.bind(this, false));
            } catch(e) {
                this.addConsoleText(e.toString(), true);
                this.gl = null;
            }

        },
        onEdit: function(instance, obj) {
            var newValue = this.javaScriptEditor.getValue();
            var codeCorrect = false;
            this.storage.lastShaderCode = newValue;
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
                this.updateParameterSelection(params.shaderParameters);
                this.updateOutput();

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
            if(!this.paramStateLoaded){
                this.paramStateLoaded = true;
                if(this.storage.lastParamState){
                    this.loadParamInfo(JSON.parse(this.storage.lastParamState));
                }
            }

        },
        loadParamInfo: function(paramData){
            for(var name in paramData){
                var data = paramData[name];
                var sourceName = "_" + name + "__source";
                this.paramForm.elements[name].value = data.type;
                this.paramForm.elements[sourceName].value = data.source;
            }
        },

        updateOutput: function(){
            var contextData = {
                "this" : ShadeStudio.SystemParams,
                "global.shade" : [
                    {
                      "extra": {
                          "type": "object",
                          "kind": "any",
                          "global" : true,
                          "info" : {
                              "position": {
                                  "type": "object",
                                  "kind": "float3",
                                  "source": "vertex"
                              }

                          }
                      }
                    }
                ]
            }
            var paramState = {};
            for(var i = 0; i < this.paramList.length; ++i){
                var name = this.paramList[i], sourceName = "_" + name + "__source";
                var selection = {
                    type: this.paramForm.elements[name].value,
                    source: this.paramForm.elements[sourceName].value
                };
                paramState[name] = selection;

                var dest = contextData["global.shade"][0].extra.info[name] = {};
                var typeData = TYPE_LIST[selection.type];

                for(var j in typeData){
                    dest[j] = typeData[j];
                }
                dest["source"] = SOURCE_MAP[selection.source];
            }
            this.storage.lastParamState = JSON.stringify(paramState);
            var code = this.javaScriptEditor.getValue();

            var aast = Shade.parseAndInferenceExpression(code, { inject: contextData, loc: true, implementation: "xml3d-glsl-forward" });
            var result = Shade.compileFragmentShader(aast, {useStatic : true });

            this.codeViewer.setValue(result);
            this.compileGL();
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
        },
        initGL: function () {
            var gl = this.gl;
            var ext = gl.getExtension('OES_standard_derivatives');
            if (!ext)
                this.addConsoleText("Standard derivates are not supported on your graphics card");

            this.quad = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, this.quad);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1.0, -1.0,1.0, -1.0,-1.0,  1.0,-1.0,  1.0,1.0, -1.0,1.0,  1.0]), gl.STATIC_DRAW);
        },
        compileGL: function() {
            var fragmentSource = this.codeViewer.getValue();
            if(!this.gl)
                return;
            var info = this.compileShader(this.gl.FRAGMENT_SHADER, fragmentSource);
            if (info.error) {
                this.addConsoleText(info.error, true);
            } else {
                this.addConsoleText("GLSL: Compiled fragment shader successfully");
                this.compileProgram(info.shader);
                this.renderFrame();
            }
        },
        compileShader: function(kind, source) {
            var gl = this.gl;
            var shader = gl.createShader(kind);
            gl.shaderSource(shader, source);
            gl.compileShader(shader);

            if (gl.getShaderParameter(shader, gl.COMPILE_STATUS) == 0) {
                var errorString = "Failed to compile: ";
                errorString += gl.getShaderInfoLog(shader);
                gl.getError();
                return { error: errorString };
            } else {
                return { shader: shader };
            }
        },
        compileProgram : function(fragmentShader) {
            var gl = this.gl;
            this.program = null;

            var canvasWidth = $(".theCanvas")[0].width = $(".theCanvas")[0].clientWidth,
                canvasHeight = $(".theCanvas")[0].height = $(".theCanvas")[0].clientHeight;

            gl.viewport( 0, 0, canvasWidth, canvasHeight );
            var vertex = this.compileShader(gl.VERTEX_SHADER, ["attribute vec2 a_position;","void main() { gl_Position = vec4(a_position, 0, 1); }"].join("\n"));
            if(vertex.error)
                return;

            var program = gl.createProgram();
            gl.attachShader(program, fragmentShader);
            gl.attachShader(program, vertex.shader);
            gl.linkProgram(program);
            if (gl.getProgramParameter(program, gl.LINK_STATUS) == 0) {
                var errorString = "Shader linking failed: \n";
                errorString += gl.getProgramInfoLog(program);
                gl.getError();
                this.addConsoleText(errorString, true);
                return;
            }
            this.program = program;
            gl.useProgram(program);
            // Set system parameters

            var location;
            location = gl.getUniformLocation(program, "_sys_coords"); location && gl.uniform3f(location, canvasWidth, canvasHeight, 1.0);
        },
        renderFrame: function(time) {
            var gl = this.gl;
            var program = this.program;
            if (!(gl && program))
                return;

            time = time || 0;

            gl.useProgram(program);

            var location;
            location = gl.getUniformLocation(program, "_env_time"); location && gl.uniform1f(location, time);

            var positionLocation = gl.getAttribLocation(program, "a_position");
            gl.bindBuffer(gl.ARRAY_BUFFER, this.quad);
            gl.enableVertexAttribArray(positionLocation);
            gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
            gl.drawArrays(gl.TRIANGLES, 0, 6);
        },
        setAnimate: function(start) {
            this.animStatus = start;
            if (start) {
                this.startTime = Date.now();
                this.tick();
            }
        },
        tick: function() {
            var time = Date.now();
            this.renderFrame((time - this.startTime) / 1000.0);
            if (this.animStatus == true) {
                window.requestAnimationFrame(this.tick.bind(this));
            }
        }
    }

    function createParamSelect(selectName, selectedValue, sourceValue){
        var listEntry = $('<li><label for="' + selectName +'">' + selectName +'</label></li>');

        var select = $("<select></select>");
        for(var name in TYPE_LIST){
            select.append($("<option>" + name + "</option>"));
        }
        select[0].name = selectName;
        select[0].value = selectedValue || "UNDEFINED";
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
            ns.ShadeStudio.onEdit();
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

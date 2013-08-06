(function (ns) {

    var ShadeStudio = function() {

    };

    ShadeStudio.prototype = {
        init: function() {
            this.javaScriptEditor = CodeMirror.fromTextArea(document.querySelector("textarea"), {
                mode: "javascript",
                lineNumbers: true

            });
            this.javaScriptEditor.on("change", this.onEdit.bind(this));
            this.codeViewer = CodeMirror(document.querySelector(".glsl"), {
                value: "",
                mode:  "x-shader/x-fragment",
                readOnly: true
            });
        },
        onEdit: function(instance, obj) {
            var newValue = instance.getValue();
            this.codeViewer.setValue(newValue);
            try {
                var params = Shade.extractParameters(newValue);
                console.log(params);
            } catch (e) {
                console.log(e);
            }

        }
    }

    ns.ShadeStudio = new ShadeStudio();

}(window));

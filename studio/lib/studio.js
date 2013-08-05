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
            this.codeViewer =  CodeMirror(document.querySelector(".glsl"), {
                value: "void main(void) {}\n",
                mode:  "clike",
                readOnly: true
            });
        },
        onEdit: function(instance, obj) {
            console.log("Edit", arguments, this.codeViewer.setValue);
            this.codeViewer.setValue(instance.getValue())
        }
    }

    ns.ShadeStudio = new ShadeStudio();

}(window));

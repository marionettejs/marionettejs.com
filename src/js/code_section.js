var CodeSampleSection = Marionette.LayoutView.extend({
    regions: {
        examples: '[name="example-index"]',
        data: '.example-data',
        view: '.example-view',
        rendered: '.example-render'
    },

    events: {
        'change [name=example-index]:radio': 'onRender'
    },

    onRender: function() {
        // Destroy previous instance
        if (typeof this.viewEditor !== 'undefined') {
            _.chain([this.view, this.data]).pluck('CodeMirror').invoke('toTextArea');
        }
        var $example = this.$(this.examples.value);
        this.viewEditor = CodeMirror.fromTextArea(this.view, {
            value: $example.find('.view-code').text(),
            lineNumbers: true,
            mode: 'javascript'
        });
        this.dataEditor = CodeMirror.fromTextArea(this.data, {
            value: $example.find('.data-code').text(),
            lineNumbers: true,
            mode: 'javascript'
        });

        _.invoke([this.viewEditor, this.dataEditor], 'on', 'change', _.bind(this.updateRender, this));
    },

    updateRender: function() {
        // Probably should be sandboxed, not too familiar with the options out there right now
        eval(this.viewEditor.getValue() + ';' + this.dataEditor.getValue());
    } 
});

new CodeSampleSection({
    el: '#code-samples'
});
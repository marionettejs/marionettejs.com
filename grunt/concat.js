module.exports = {
  options: {
    separator: '\n',
    sourceMap: true
  },
  dist: {
    src: [
      'bower_components/jquery/dist/jquery.min.js',
      'bower_components/jQuery.equalHeights/jquery.equalheights.min.js',
      'bower_components/google-code-prettify/bin/prettify.min.js',
      'bower_components/jquery-unveil/jquery.unveil.min.js',
      'bower_components/snabbt.js/snabbt.min.js',
      'src/js/script.js',
      'src/js/github.js',
      'src/js/inspector-comment.js',
      'bower_components/underscore/underscore.js',
      'bower_components/backbone/backbone.js',
      'backbone.marionette/lib/backbone.marionette.js'
    ],
    dest: 'dist/js/build.js'
  }
};

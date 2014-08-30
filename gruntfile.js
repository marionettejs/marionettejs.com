module.exports = function(grunt) {
  require('load-grunt-tasks')(grunt);
  grunt.loadTasks('tasks');

  grunt.initConfig({
    compileDocs: {
      marionette: {
        options: {
          repo      : 'backbone.marionette',
          template  : 'src/docs/template.html'
        },
        src  : 'backbone.marionette/docs',
        dest : 'dist/docs'
      }
    }
  });

  grunt.registerTask('default', [
    'compileDocs'
  ]);
};

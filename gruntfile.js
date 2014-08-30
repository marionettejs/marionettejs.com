module.exports = function(grunt) {
  require('load-grunt-tasks')(grunt);
  grunt.loadTasks('tasks');

  grunt.initConfig({
    less: {
      marionette: {
        files: {
          'dist/styles/main.css': 'src/styles/main.less'
        }
      }
    },

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
    'compileDocs',
    'less'
  ]);
};

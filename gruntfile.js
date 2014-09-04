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

    copy: {
      assets: {
        files: [
          {
            expand: true,
            cwd: 'src/',
            src: ["images/**/*"],
            dest: 'dist/'
          }
        ]
      }
    },

    sass: {
      options: {
        compass: true
      },
      dist: {
        files: {
          "dist/styles/marionette.css": "src/stylesheets/marionette.scss"
        }
      }
    },

    watch: {
      options: {
        atBegin: true
      },
      styles: {
        files: "src/stylesheets/**/*.scss",
        tasks: ['sass']
      },
      assets: {
        files: "src/images/**/*",
        tasks: ['copy']
      },
      pages: {
        files: "src/**/*.jade",
        tasks: ['jade']
      }
    },

    jade: {
      compile : {
        files: {
          "dist/index.html": "src/index.jade"
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

  grunt.registerTask('dev', [
    'watch'
  ]);

  grunt.registerTask('default', [
    'compileDocs',
    'less'
  ]);
};

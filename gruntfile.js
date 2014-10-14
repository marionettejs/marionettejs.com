module.exports = function(grunt) {
  require('load-grunt-tasks')(grunt);

  grunt.initConfig({});
  grunt.loadTasks('tasks');
  grunt.loadTasks("backbone.marionette/tasks");

  grunt.config.merge({
    less: {
      marionette: {
        files: {
          'dist/styles/main.css': 'src/styles/main.less'
        }
      }
    },

    'gitty:latestTag': {
      marionette: {
        options: {
          repo: 'backbone.marionette'
        }
      }
    },

    docco: {
      build: {
        src: ['backbone.marionette/lib/backbone.marionette.js'],
        options: {
          output: 'dist/annotated-src/'
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
          },
          {
            expand: true,
            cwd: 'src/',
            src: ["js/**/*"],
            dest: 'dist/'
          },
          {
            expand: true,
            src: ["bower_components/**/*"],
            dest: 'dist/'
          },
          {
            expand: true,
            cwd: 'src/stylesheets',
            src: ["fonts/icons/*"],
            dest: 'dist/styles'
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
          "dist/styles/marionette.css": "src/stylesheets/marionette.scss",
          "dist/styles/api.css": "src/stylesheets/api.scss"
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
    },

    compileApi: {
      marionette: {
        options: {
          repo : 'backbone.marionette',
        },
        src  : 'src/api',
        dest : 'dist/api'
      }
    }
});

  grunt.registerTask('dev', [
    'watch'
  ]);

  grunt.registerTask('compile-site', [
    'sass',
    'copy',
    'jade'
  ]);

  grunt.registerTask('compile-docs', [
    'compileDocs',
    'less'
  ]);

  grunt.registerTask('compile-api', [
    'compileApi',
    'less'
  ]);

  grunt.registerTask('compile-docco', [
    'gitty:latestTag:marionette',
    'docco:build'
  ]);

  grunt.registerTask('compile-downloads', [
    'compileDownloads'
  ]);

  grunt.registerTask('compile-all', [
    'compile-site',
    'compile-docs',
    'compile-docco',
    'compile-downloads',
    'compile-api'
  ]);
};

var autoprefixer = require('autoprefixer-core');

module.exports = function(grunt) {
  require('load-grunt-tasks')(grunt);

  grunt.initConfig({});
  grunt.loadTasks('tasks');
  grunt.loadTasks("backbone.marionette/tasks");

  grunt.config.merge({
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
      dist: {
        files: {
          "dist/styles/marionette.css": "src/stylesheets/marionette.scss",
          "dist/styles/api.css": "src/stylesheets/api.scss",
          'dist/styles/docs.css': 'src/stylesheets/docs.scss'
        }
      }
    },

    postcss: {
      options: {
        processors: [
          autoprefixer({ browsers: ['last 2 version'] }).postcss
        ]
      },
      dist: { src: 'dist/styles/*.css' }
    },

    watch: {
      options: {
        atBegin: true
      },
      styles: {
        files: "src/stylesheets/**/*.scss",
        tasks: ['notify:preHTML', 'sass', 'postcss', 'notify:postHTML']
      },
      assets: {
        files: "src/images/**/*",
        tasks: ['copy']
      },
      pages: {
        files: "src/**/*.jade",
        tasks: ['notify:preHTML', 'jade', 'notify:postHTML']
      }
    },

    jade: {
      compile : {
        files: {
          "dist/index.html": "src/index.jade"
        },
        options: {
          data: {
            VERSION: grunt.option("VERSION") || "V.X.X.X"
          }
        }
      }
    },

    notify: {
      watch: {
        options: {
          message: 'Watching for changes...'
        }
      },

      preHTML: {
        options: {
          message: 'Compiling HTML files...'
        }
      },
      postHTML: {
        options: {
          message: 'HTML files compiled.'
        }
      },

      preCSS: {
        options: {
          message: 'Compiling CSS files...'
        }
      },
      postCSS: {
        options: {
          message: 'CSS files compiled.'
        }
      }
    },

    compileDocs: {
      marionette: {
        options: {
          repo      : 'backbone.marionette',
          template  : 'src/docs/template.html',
          indexTemplate  : 'src/docs/index.html'
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
    'notify:watch',
    'watch'
  ]);

  grunt.registerTask('compile-site', [
    'sass',
    'copy',
    'jade',
    'postcss'
  ]);

  grunt.registerTask('compile-docs', [
    'compileDocs',
    'sass',
    'copy',
    'gitty:latestTag'
  ]);

  grunt.registerTask('compile-api', [
    'compileApi',
    'sass'
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

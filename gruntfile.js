var autoprefixer = require('autoprefixer-core');
var GittyCache = require('./tasks/utils/gitty-cache');

module.exports = function(grunt) {
  require('load-grunt-tasks')(grunt);

  grunt.initConfig({});
  grunt.loadTasks('tasks');
  grunt.loadTasks('backbone.marionette/tasks');

  GittyCache.setReleaseTag(grunt.option('TAG'));

  grunt.config.merge({
    'gitty:releaseTag': {
      marionette: {
        options: {
          repo: 'backbone.marionette'
        }
      }
    },
    'gitty:checkoutTag': {
      marionette: {
        options: {
          repo: 'backbone.marionette'
        }
      }
    },

    concat: {
      options: {
        separator: ';\n'
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
    },

    docco: {
      build: {
        src: ['backbone.marionette/lib/backbone.marionette.js'],
        options: {
          output: 'dist/annotated-src/'
        }
      }
    },

    clean: {
      dist: ['dist']
    },

    connect: {
      server: {
        options: {
          base: 'dist',
          port: 8000
        }
      }
    },

    copy: {
      assets: {
        files: [
          {
            expand: true,
            cwd: 'src/',
            src: ['images/**/*','!images/**/*.{png,jpg,gif}'],
            dest: 'dist/'
          },
          {
            expand: true,
            src: ['bower_components/**/*'],
            dest: 'dist/'
          },
          {
            cwd: 'src/',
            expand: true,
            src: ['js/docs.js'],
            dest: 'dist'
          }
        ]
      }
    },

    imagemin: {
      dynamic: {
        files: [{
          expand: true,
          cwd: 'src/',
          src: ['images/**/*.{png,jpg,gif}'],
          dest: 'dist/'
        }]
      }
    },

    svgstore: {
      options: {},
      default : {
        files: {
          'src/images/svg-sprite.svg': ['src/svg-icons/*.svg']
        }
      }
    },

    sass: {
      dist: {
        options:{
          outputStyle: 'compressed'
        },
        files: {
          'dist/styles/marionette.css': 'src/stylesheets/marionette.scss',
          'dist/styles/api.css': 'src/stylesheets/api.scss',
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
      svg: {
        files: 'src/svg-icons/*.svg',
        tasks: ['svgstore', 'sass']
      },
      styles: {
        files: 'src/stylesheets/**/*.scss',
        tasks: ['notify:preHTML', 'sass', 'postcss', 'notify:postHTML']
      },
      scripts: {
        files: 'src/js/**/*',
        tasks: ['notify:preHTML', 'concat', 'copy', 'notify:postHTML']
      },
      assets: {
        files: 'src/images/**/*',
        tasks: ['imagemin', 'copy']
      },
      pages: {
        files: 'src/**/*.jade',
        tasks: ['notify:preHTML', 'compile-templates', 'notify:postHTML']
      }
    },

    jade: {
      compile : {
        files: {
          'dist/index.html': 'src/index.jade'
        },
        options: {
          data: function(){
            return {
              VERSION: GittyCache.releaseTag || 'v.X.X.X'
            };
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
          indexTemplate  : 'src/docs/index.html',
          svgIcons  : 'src/images/svg-sprite.svg'
        },
        src  : 'backbone.marionette/docs',
        dest : 'dist/docs'
      }
    },

    compileApi: {
      marionette: {
        options: {
          repo : 'backbone.marionette'
        },
        src  : 'src/api',
        dest : 'dist/api'
      }
    }
  });

  grunt.registerTask('dev', [
    'clean:dist',
    'connect',
    'notify:watch',
    'watch'
  ]);

  grunt.registerTask('compile-site', [
    'svgstore',
    'sass',
    'concat',
    'copy',
    'imagemin',
    'compile-templates',
    'postcss'
  ]);

  grunt.registerTask('compile-templates', [
    'gitty:releaseTag',
    'jade'
  ]);

  grunt.registerTask('compile-docs', [
    'gitty:releaseTag',
    'compileDocs',
    'sass',
    'gitty:checkoutTag'
  ]);

  grunt.registerTask('compile-api', [
    'compileApi',
    'sass'
  ]);

  grunt.registerTask('compile-docco', [
    'gitty:checkoutTag:marionette',
    'docco:build'
  ]);

  grunt.registerTask('compile-downloads', [
    'compileDownloads'
  ]);

  grunt.registerTask('compile-all', [
    'compile-site',
    'compile-docs',
    'compile-docco',
    'compile-downloads'
  ]);
};

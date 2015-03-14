var autoprefixer = require('autoprefixer-core');
var GittyCache = require('./tasks/utils/gitty-cache');
var _ = require('underscore');

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
    critical: {
      options: {
        base: './',
        width: 1200,
        height: 800
      },
      home: {
          options: {
              css: [
                  'dist/styles/marionette.css'
              ]
          },
          src: 'dist/index.html',
          dest: 'dist/index.html'
      },
      inspector: {
          options: {
            css: [
              'dist/styles/inspector.css'
            ]
          },
          src: 'dist/inspector/index.html',
          dest: 'dist/inspector/index.html'
      }
    },
    concat: {
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
    },

    uglify: {
      options: {
        compress: true,
        mangle: false,
        preserveComments: false,
        screwIE8: true,
        sourceMap: false
      },
      dist: {
        files: {
          'dist/js/build.js': ['<%= concat.dist.dest %>']
        }
      },
      polyfills: {
        files: {
          'dist/js/classList.js': ['bower_components/html5-polyfills/classList.js']
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
            src: ['images/**/*', '!images/**/*.{png,jpg,gif,ico}'],
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
          },
          {
            expand: true,
            cwd: 'bower_components/jquery/dist',
            src: ['jquery.min.map'],
            dest: 'dist/js'
          }
        ]
      },
      main: {
        files: [
          {
            cwd: 'src/',
            expand: true,
            src: ['robots.txt'],
            dest: 'dist/'
          },
          {
            cwd: 'src/images/favicons',
            expand: true,
            src: ['**.*'],
            dest: 'dist/'
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
      options: {
        includeTitleElement: false
      },
      default: {
        files: {
          'src/images/svg-sprite.svg': ['src/svg-icons/*.svg']
        }
      }
    },

    sass: {
      options:{
        outputStyle: 'compressed'
      },
      dist: {
        files: {
          'dist/styles/marionette.css': 'src/stylesheets/marionette.scss',
          'dist/styles/inspector.css': 'src/stylesheets/inspector.scss',
          'dist/styles/api.css': 'src/stylesheets/api.scss',
          'dist/styles/docs.css': 'src/stylesheets/docs.scss'
        }
      },
      dev: {
        options:{
          outputStyle: 'nested',
          sourceMap: true
        },
        files: {
          'dist/styles/marionette.css': 'src/stylesheets/marionette.scss',
          'dist/styles/inspector.css': 'src/stylesheets/inspector.scss',
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
      dev: {
        options: {
          map: true
        },
        src: 'dist/styles/*.css'
      },
      dist: {
        src: 'dist/styles/*.css'
      }
    },

    watch: {
      options: {
        atBegin: true
      },
      svg: {
        files: 'src/svg-icons/*.svg',
        tasks: ['svgstore', 'sass:dev']
      },
      styles: {
        files: 'src/stylesheets/**/*.scss',
        tasks: ['notify:preCSS', 'sass:dev', 'postcss:dev', 'notify:postCSS']
      },
      scripts: {
        files: 'src/js/**/*',
        tasks: ['notify:preHTML', 'concat', 'uglify:polyfills', 'copy', 'notify:postHTML']
      },
      assets: {
        files: 'src/images/**/*',
        tasks: ['imagemin', 'copy']
      },
      data: {
        files: 'src/data/*.json',
        tasks: ['notify:preHTML', 'compile-templates', 'notify:postHTML']
      },
      pages: {
        files: 'src/**/*.jade',
        tasks: ['notify:preHTML', 'compile-templates', 'notify:postHTML']
      }
    },

    jade: {
      compile: {
        files: {
          'dist/index.html': 'src/index.jade',
          'dist/inspector/index.html': 'src/inspector/index.jade',
          'dist/download/index.html': 'src/download/index.jade'

        },
        options: {
          data: function() {
            return _.extend(
              require('./src/data/locals.json'),
              {
                VERSION: GittyCache.releaseTag || 'v.X.X.X',
                books: require('./src/data/books.json'),
                videos: require('./src/data/videos.json')
              }
            );
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

      data: {
        options: {
          messages: 'Data .json files changed ...'
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
          repo: 'backbone.marionette',
          template: 'src/docs/template.hbs',
          indexTemplate: 'src/docs/index.hbs',
          svgIcons: 'src/images/svg-sprite.svg'
        },
        src: 'backbone.marionette/docs',
        dest: 'dist/docs'
      }
    },

    compileApi: {
      marionette: {
        options: {
          repo: 'backbone.marionette'
        },
        src: 'src/api',
        dest: 'dist/api'
      }
    },

    compileAnnotatedSrc: {
      marionette: {
        options: {
          repo: 'backbone.marionette',
          src: 'backbone.marionette/lib/backbone.marionette.js',
          template: 'src/docco/marionette.jst',
          css: 'src/docco/marionette.css',
          output: 'dist/annotated-src/'
        }
      }
    },
  });

  grunt.registerTask('dev', [
    'clean:dist',
    'connect',
    'notify:watch',
    'watch'
  ]);

  grunt.registerTask('compile-site', [
    'svgstore',
    'sass:dist',
    'concat',
    'uglify',
    'copy',
    'imagemin',
    'compile-templates',
    'postcss:dist',
    'critical'
  ]);

  grunt.registerTask('compile-templates', [
    'gitty:releaseTag',
    'jade'
  ]);

  grunt.registerTask('compile-docs', [
    'gitty:releaseTag',
    'compileDocs',
    'sass:dist',
    'gitty:checkoutTag'
  ]);

  grunt.registerTask('compile-api', [
    'compileApi',
    'sass:dist'
  ]);

  grunt.registerTask('compile-annotated-src', [
    'gitty:releaseTag',
    'compileAnnotatedSrc',
    'gitty:checkoutTag'
  ]);

  grunt.registerTask('compile-downloads', [
    'compileDownloads'
  ]);

  grunt.registerTask('compile-all', [
    'compile-site',
    'compile-docs',
    'compile-annotated-src',
    'compile-downloads'
  ]);
};

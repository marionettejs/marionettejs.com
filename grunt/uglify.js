module.exports = {
  options: {
    compress: true,
    mangle: false,
    preserveComments: false,
    sourceMap: false
  },
  main: {
    files: {
      'dist/js/build.js': ['<%= concat.main.dest %>']
    }
  },
  docs: {
    files: {
      'dist/js/docs.js': ['<%= concat.docs.dest %>']
    }
  },
  polyfills: {
    files: {
      'dist/js/classList.js': ['bower_components/html5-polyfills/classList.js']
    }
  }
};

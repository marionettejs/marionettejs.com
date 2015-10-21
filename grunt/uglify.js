module.exports = {
  options: {
    compress: true,
    mangle: false,
    preserveComments: false,
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
};

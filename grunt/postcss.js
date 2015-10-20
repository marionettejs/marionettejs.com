module.exports = {
  options: {
    processors: [
      require('autoprefixer-core')({
        browsers: ['last 2 version']
      }).postcss
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
};

module.exports = {
  options: {
    processors: [
      require('autoprefixer')({browsers: 'last 2 versions'})
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

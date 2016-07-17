module.exports = {
  js: {
    options: {
      assets: ['js/*.js'],
      baseDir: './dist/'
    },
    src: ['dist/**/**.html']
  },
  css: {
    options: {
      assets: ['styles/*.css'],
      baseDir: './dist/'
    },
    src: ['dist/**/**.html']
  },
  all: {
    options: {
      assets: ['js/*.js', 'styles/*.css'],
      baseDir: './dist/'
    },
    src: ['dist/**/**.html']
  }
};

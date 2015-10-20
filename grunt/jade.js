module.exports = {
  compile: {
    files: {
      'dist/index.html': 'src/index.jade',
      'dist/inspector/index.html': 'src/inspector/index.jade',
      'dist/download/index.html': 'src/download/index.jade'

    },
    options: {
      data: function() {
        return _.extend(
          require('./src/data/locals.json'), {
            VERSION: GittyCache.releaseTag || 'v.X.X.X',
            books: require('./src/data/books.json'),
            videos: require('./src/data/videos.json')
          }
        );
      }
    }
  }
};

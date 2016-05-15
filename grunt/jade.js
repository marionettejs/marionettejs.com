var _, GittyCache;

_ = require('underscore');
GittyCache = require('../tasks/utils/gitty-cache');

module.exports = {
  compile: {
    files: {
      'dist/index.html': 'src/index.jade',
      'dist/inspector/index.html': 'src/inspector/index.jade',
      'dist/download/index.html': 'src/download/index.jade',
      'dist/updates/index.html': 'src/updates/index.jade',
      'dist/additional-resources/index.html': 'src/additional-resources/index.jade'
    },
    options: {
      data: function() {
        return _.extend(
          require('../src/data/locals.json'), {
            VERSION: GittyCache.releaseTag || 'v.X.X.X',
            books: require('../src/data/books.json'),
            videos: require('../src/data/videos.json'),
            ar_videos: require('../dist/data/videos.json'),
            ar_tutorials: require('../dist/data/tutorials.json'),
            ar_libs: require('../dist/data/libs.json'),
            ar_examples: require('../dist/data/examples.json'),
            ar_books: require('../dist/data/books.json')
          }
        );
      }
    }
  }
};

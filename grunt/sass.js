module.exports = {
  options: {
    outputStyle: 'compressed'
  },
  dist: {
    files: {
      'dist/styles/marionette.css': 'src/stylesheets/marionette.scss',
      'dist/styles/inspector.css': 'src/stylesheets/inspector.scss',
      'dist/styles/updates.css': 'src/stylesheets/updates.scss',
      'dist/styles/api.css': 'src/stylesheets/api.scss',
      'dist/styles/docs.css': 'src/stylesheets/docs.scss',
      'dist/styles/docco.css': 'src/stylesheets/docco.scss'
    }
  },
  dev: {
    options: {
      outputStyle: 'nested',
      sourceMap: true
    },
    files: {
      'dist/styles/marionette.css': 'src/stylesheets/marionette.scss',
      'dist/styles/inspector.css': 'src/stylesheets/inspector.scss',
      'dist/styles/updates.css': 'src/stylesheets/updates.scss',
      'dist/styles/api.css': 'src/stylesheets/api.scss',
      'dist/styles/docs.css': 'src/stylesheets/docs.scss',
      'dist/styles/docco.css': 'src/stylesheets/docco.scss'
    }
  }
};

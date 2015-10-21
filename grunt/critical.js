module.exports = {
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
};

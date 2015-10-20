module.exports = {
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
};

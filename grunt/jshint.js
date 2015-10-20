module.exports = {
  options: {
    jshintrc: '.jshintrc',
    reporter: require('jshint-stylish')
  },
  grunt: {
    src: ['gruntfile.js']
  },
  core: {
    src: 'src/js/*.js'
  }
};

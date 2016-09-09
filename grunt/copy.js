module.exports = {
  assets: {
    files: [{
      expand: true,
      cwd: 'src/',
      src: ['images/**/*', '!images/**/*.{png,jpg,gif,ico}'],
      dest: 'dist/'
    }, {
      expand: true,
      src: ['bower_components/**/*'],
      dest: 'dist/'
    }, {
      expand: true,
      cwd: 'bower_components/jquery/dist',
      src: ['jquery.min.map'],
      dest: 'dist/js'
    }]
  },
  main: {
    files: [{
      cwd: 'src/',
      expand: true,
      src: ['robots.txt'],
      dest: 'dist/'
    }, {
      cwd: 'src/images/favicons',
      expand: true,
      src: ['**.*'],
      dest: 'dist/'
    }]
  }
};

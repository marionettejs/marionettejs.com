module.exports = {
  options: {
    atBegin: true
  },
  svg: {
    files: 'src/svg-icons/*.svg',
    tasks: [
      'svgstore',
      'sass:dev',
      'compile-service-worker'
    ]
  },
  styles: {
    files: 'src/stylesheets/**/*.scss',
    tasks: [
      'clean:css',
      'notify:preCSS',
      'sass:dev',
      'postcss:dev',
      'notify:postCSS',
      'cacheBust:css',
      'compile-service-worker'
    ]
  },
  scripts: {
    files: 'src/js/**/*',
    tasks: [
      'notify:preHTML',
      'lint:core',
      'clean:js',
      'concat:main',
      'concat:docs',
      'uglify:polyfills',
      'copy',
      'notify:postHTML',
      'cacheBust:js',
      'compile-service-worker'
    ]
  },
  gruntfile: {
    files: 'gruntfile.js',
    tasks: ['lint:grunt']
  },
  assets: {
    files: 'src/images/**/*',
    tasks: [
      'imagemin',
      'copy',
      'compile-service-worker'
    ]
  },
  data: {
    files: 'src/data/*.json',
    tasks: [
      'notify:preHTML',
      'lint-data',
      'compile-templates',
      'notify:postHTML',
      'compile-service-worker'
    ]
  },
  pages: {
    files: 'src/**/*.jade',
    tasks: [
      'notify:preHTML',
      'compile-templates',
      'notify:postHTML',
      //@todo clear previously created files with hashes
      'cacheBust:all',
      'compile-service-worker'
    ]
  }
};

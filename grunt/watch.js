module.exports = {
  options: {
    atBegin: true
  },
  svg: {
    files: 'src/svg-icons/*.svg',
    tasks: ['svgstore', 'sass:dev']
  },
  styles: {
    files: 'src/stylesheets/**/*.scss',
    tasks: ['notify:preCSS', 'sass:dev', 'postcss:dev', 'notify:postCSS']
  },
  scripts: {
    files: 'src/js/**/*',
    tasks: [
      'notify:preHTML',
      'lint:core',
      'concat',
      'uglify:polyfills',
      'copy',
      'notify:postHTML'
    ]
  },
  gruntfile: {
    files: 'gruntfile.js',
    tasks: ['lint:grunt']
  },
  assets: {
    files: 'src/images/**/*',
    tasks: ['imagemin', 'copy']
  },
  data: {
    files: 'src/data/*.json',
    tasks: ['notify:preHTML', 'lint-data', 'compile-templates', 'notify:postHTML']
  },
  pages: {
    files: 'src/**/*.jade',
    tasks: ['notify:preHTML', 'compile-templates', 'notify:postHTML']
  }
};

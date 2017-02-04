module.exports = {
  'default': [],

  'clean': [
    'clean:dist'
  ],

  'build': [
    'compile-additional-resources',
    'connect',
    'notify:watch',
    'watch'
  ],

  'dev': [
    'clean',
    'build'
  ],

  'dev-docs': [
    'clean',
    'compile-docs',
    'build'
  ],

  'lint': [
    'lintspaces',
    'jshint',
    'jscs'
  ],

  'lint-core': [
    'lintspaces:core',
    'jshint:core',
    'jscs:core'
  ],

  'lint-grunt': [
    'lintspaces:grunt',
    'jshint:grunt',
    'jscs:core'
  ],

  'lint-data': [
    'lintspaces:data'
  ],

  'compile-site': [
    'svgstore',
    'sass:dist',
    'concat',
    'uglify',
    'copy',
    'imagemin',
    'compile-templates',
    'postcss:dist'
  ],

  'compile-templates': [
    'gitty:releaseTag',
    'jade'
  ],

  'compile-docs': [
    'gitty:releaseTag',
    'compileDocs',
    'sass:dist',
    'gitty:checkoutTag'
  ],

  'compile-api': [
    'compileApi',
    'sass:dist'
  ],

  'compile-annotated-src': [
    'gitty:releaseTag',
    'compileAnnotatedSrc',
    'gitty:checkoutTag'
  ],

  'compile-downloads': [
    'compileDownloads'
  ],

  'compile-additional-resources': [
    'compileAdditionalResources'
  ],

  'compile-all': [
    'compile-additional-resources',
    'compile-site',
    'compile-docs',
    'compile-annotated-src',
    'compile-downloads'
  ],

  'pagespeed': [
    'psiNgrok',
    'connect:server:keepalive'
  ]
};

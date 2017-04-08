var Compiler = require('./compilers/write-service-worker');

module.exports = function(grunt) {
  grunt.registerMultiTask('compileSW', function() {
    var options   = this.options();
    var compiler  = new Compiler({
      rootDir : options.rootDir,
      handleFetch : options.handleFetch
    });

    compiler.compile().then(this.async());
  });
};
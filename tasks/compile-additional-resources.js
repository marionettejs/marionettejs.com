var path     = require('path');
var Compiler = require('./compilers/additional-resources');

module.exports = function(grunt) {
  grunt.registerMultiTask('compileAdditionalResources', function() {
    var options   = this.options();
    var compiler  = new Compiler({
      resUrl : options.resUrl,
      output : path.resolve(options.output)
    });
    compiler.compile()
      .then(this.async());
  });
};
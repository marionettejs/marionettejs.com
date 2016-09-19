var psiNgrok = require('psi-ngrok');

module.exports = function(grunt) {
  grunt.registerMultiTask('psiNgrok', function() {
    var async = this.async;

    grunt.event.once('connect.server.listening', function(host, port) {
      psiNgrok({
        pages: ['/', 'additional-resources', 'downloads', 'docs/current', 'updates'],
        onError: function(error) {
          grunt.fatal(error)
        },
        port: port,
        options: {
          //@todo up it to 85-90 when pages speed will be fixed
          threshold: 10
        }
      }).then(function() {
        var done = async();

        done();
      });
    });
  });
};
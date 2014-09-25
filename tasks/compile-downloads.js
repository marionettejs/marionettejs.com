var exec = require('child_process').exec;
var path = require('path');

// This file is quite simple in what it does
// it just invokes a shell script which downloads
// multiple assets from github and other sources
// to distibute on the main www.

// For now a shell script will do since it is a series
// of bash friendly tasks that need to be invoked.

// Obviously this could be optimized with promises and some advanced
// flow to remove the need to have a shell script.
// However now for the sake of time I am ok with thi.
module.exports = function(grunt) {
  grunt.registerTask('compileDownloads', function() {
    var done = this.async();

    exec(path.join('tasks','compile-downloads.sh'), function(err, stdout, stderr) {
      console.log(stdout);

      if (err) {
        console.log(err);
      } else {
        done();
      }
    });
  });
};
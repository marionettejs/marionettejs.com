var _       = require('underscore');
var path    = require('path');
var gitty   = require('gitty');
var Promise = require('bluebird');

module.exports = function(grunt) {
  grunt.registerMultiTask('gitty:latestTag', function() {
    var options = this.options();
    var done = this.async();
    var repo = Promise.promisifyAll(gitty(path.resolve(options.repo)));

    repo.tagsAsync()
    .then(function(tags) {
      var lastTag = _.last(tags);

      return repo.checkoutAsync(lastTag).then(function() {
        return lastTag;
      })
    })
    .then(function(lastTag) {
      grunt.log.ok('Latest Tag Checked out! -- ' + lastTag);
      done();
    });
  });
};

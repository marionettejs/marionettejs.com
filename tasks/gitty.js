var _        = require('underscore');
var path     = require('path');
var gitty    = require('gitty');
var Promise  = require('bluebird');
var GittyCache = require('./utils/gitty-cache');

module.exports = function(grunt) {
  grunt.registerMultiTask('gitty:checkoutTag', function() {
    var options = this.options();
    var done = this.async();
    var repo = Promise.promisifyAll(gitty(path.resolve(options.repo)));

    GittyCache.getReleaseTag(repo)
      .then(function(tag) {
        return repo.checkoutAsync(tag).then(function() {
          return tag;
        });
      })
      .then(function(tag) {
        grunt.log.ok('Tag Checked out! -- ' + tag);
        done();
      });
  });

  grunt.registerMultiTask('gitty:releaseTag', function() {
    var options = this.options();
    var done = this.async();
    var repo = Promise.promisifyAll(gitty(path.resolve(options.repo)));

    GittyCache.getReleaseTag(repo)
      .then(function(tag) {
        grunt.log.ok('Release Tag! -- ' + tag);
        done();
      });
  });
};

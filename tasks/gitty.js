var _       = require('underscore');
var path    = require('path');
var gitty   = require('gitty');
var Promise = require('bluebird');
var semver  = require('semver');

var remapInvalidTag = function(tag) {
  if (tag == 'v0.4.1a') {
    tag = 'v0.4.1-a';
  } else if (tag == 'v1.7') {
    tag = 'v1.7.0';
  } else if (tag == 'v1.4.0beta') {
    tag = 'v1.4.0-beta';
  }

  return tag;
};

var sortTags = function(tags) {
  return tags.sort(function(v1, v2) {
    return semver.rcompare(remapInvalidTag(v1), remapInvalidTag(v2));
  });
};

module.exports = function(grunt) {
  grunt.registerMultiTask('gitty:releaseTag', function() {
    var options = this.options();
    var done = this.async();
    var repo = Promise.promisifyAll(gitty(path.resolve(options.repo)));

    Promise.bind(this)
      .then(function() {
        var cliTag = grunt.option('TAG');

        if(cliTag){
          global.releaseTag = cliTag;
        }

        if(global.releaseTag){
          return global.releaseTag;
        }
        return repo.tagsAsync()
          .then(sortTags)
          .then(function(tags) {
            global.releaseTag = _.first(tags);
            return global.releaseTag;
          })
      }).then(function(tag) {
        return repo.checkoutAsync(tag).then(function() {
          return tag;
        });
      })
      .then(function(tag) {
        grunt.log.ok('Tag Checked out! -- ' + tag);
        done();
      });
  });
};

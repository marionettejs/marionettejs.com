var _       = require('underscore');
var gitty   = require('gitty');
var Promise = require('bluebird');
var sortTags = require('./tags').sort;

module.exports = {
  getSortedTags: function(repo) {
    return Promise.bind(this)
      .then(function() {

        //return if already cached
        if(this.sortedTags){
          return this.sortedTags;
        }

        return repo.tagsAsync()
          .then(sortTags)
          .then(function(tags){
            this.sortedTags = tags;
            return this.sortedTags;
          }.bind(this));
      });
  },
  getReleaseTag: function(repo) {
    return Promise.bind(this)
      .then(function() {

        //return if already cached
        if(this.releaseTag){
          return this.releaseTag;
        }

        return this.getSortedTags(repo)
          .then(function(tags) {
            this.releaseTag = _.first(tags);
            return this.releaseTag;
          }.bind(this));
      });
  },
  setReleaseTag: function(tag) {
    this.releaseTag = tag;
  }
}
var Promise      = require('bluebird');
var EventEmitter = require('events').EventEmitter;
var _            = require('underscore');
var path         = require('path');
var gitty        = require('gitty');
var validTags    = require('./utils/tags').valid;
var docco        = require('docco');
var GittyCache   = require('./utils/gitty-cache');

var Compiler = function(paths) {
  this.paths = paths;
  this.src = this.paths.src;
  this.output = this.paths.output;
  this.repo = Promise.promisifyAll(gitty(this.paths.repo));
};

Compiler.prototype = new EventEmitter();

_.extend(Compiler.prototype, {
  compile: function() {
    return Promise.bind(this)
      .then(this.setup)
      .then(this.readFiles);
  },

  setup: function() {
    return Promise.all([
      GittyCache.getSortedTags(this.repo)
    ]).bind(this).spread(function(tags) {
      this.tags = tags
    });
  },

  readFiles: function() {
    return Promise.bind(this).return(this.tags).map(function(tag) {
      return this.repo.checkoutAsync(tag).bind(this).then(function() {
        this.emit('checkoutTag', { tag: tag });
        var output = this.output + tag + '/';
        var src = this.src;

        var options = {
            args: [src],
            output: output
        };

        docco.document(options);
        
      });
    }, { concurrency: 1 });
  }
});

module.exports = function(grunt) {
  grunt.registerMultiTask('compileAnnotatedSrc', function() {
    var options   = this.options();

    var compiler  = new Compiler({
      repo     : path.resolve(options.repo),
      src      : options.src,
      output   : options.output
    });

    compiler.on('checkoutTag', function(data) {
      grunt.verbose.writeln('checkoutTag: ' + data.tag);
    });

    compiler.compile()
    .then(function() {
      compiler.removeAllListeners();
      grunt.log.ok('Success!');
    })
    .then(this.async());
  });
};

var Promise      = require('bluebird');
var fs           = Promise.promisifyAll(require('fs'));
var EventEmitter = require('events').EventEmitter;
var _            = require('underscore');
var path         = require('path');
var gitty        = require('gitty');
var validTags    = require('./utils/tags').valid;
var docco        = require('docco');
var GittyCache   = require('./utils/gitty-cache');

var Compiler = function(options) {
  _.extend(this, options);
  this.repo = Promise.promisifyAll(gitty(this.repo));
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
      GittyCache.getSortedTags(this.repo),
      GittyCache.getReleaseTag(this.repo)
    ]).bind(this).spread(function(tags, releaseTag) {
      this.tags = tags;
      this.releaseTag = releaseTag;
    });
  },

  compileDocco: function(options) {
    return new Promise(function(res, rej) {
      docco.document(options, function(err) {
        if (!err) {
          res();
        } else {
          console.log("error building docco", err);
          res();
        }
      });
    })
  },

  readFiles: function() {
    return Promise.bind(this).return(this.tags).map(function(tag) {
      return this.repo.checkoutAsync(tag).bind(this).then(function() {
        this.emit('checkoutTag', { tag: tag });
        var output = this.output + tag + '/';
        var src = this.src;
        var options = {
            args: [src],
            output: output,
            template: this.template,
            css: this.css
        };

        return this.compileDocco(options)
        .then(function() {
          var oldPath = path.join(output, 'backbone.marionette.html')
          var present = fs.existsSync(oldPath);

          if (!present) return;

          return fs.renameAsync(oldPath, path.join(output, 'index.html'));
        })
        .then(function() {
          if (this.releaseTag != tag) return;

          options.output = this.output;
          return this.compileDocco(options);
        }.bind(this));
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
      output   : options.output,
      css      : options.css,
      template : options.template
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

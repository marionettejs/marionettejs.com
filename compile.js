var Promise = require('bluebird');
var _       = require('underscore');
var fs      = Promise.promisifyAll(require('fs'));
var path    = require('path');
var gitty   = require('gitty');
var mkdirp  = Promise.promisify(require('mkdirp'));
var rimraf  = Promise.promisify(require('rimraf'));
var marked  = require('marked');

var Compiler = function() {
  this.repo = Promise.promisifyAll(gitty(this.paths.repo));

  return Promise.bind(this)
    .then(this.setup)
    .then(this.readFiles)
    .then(this.writeFiles)
    .then(this.cleanup);
};

_.extend(Compiler.prototype, {
  paths: {
    repo     : path.resolve('./backbone.marionette'),
    template : path.resolve('./src/docs/template.html'),
    tmp      : path.resolve('./tmp/' + Date.now()),
    src      : path.resolve('./backbone.marionette/docs'),
    dest     : path.resolve('./public/docs')
  },

  setup: function() {
    return Promise.all([
      fs.readFileAsync(this.paths.template).call('toString'),
      mkdirp(this.paths.tmp),
      this.repo.tagsAsync()
    ]).bind(this).spread(function(template, dir, tags) {
      this.template = _.template(template);
      this.tmpDir   = dir;
      this.tags     = tags;
    });
  },

  readFiles: function() {
    return Promise.bind(this).return(this.tags).map(function(tag) {
      return this.repo.checkoutAsync(tag).bind(this).then(function() {
        return fs.readdirAsync(this.paths.src);
      }).filter(function(filename) {
        return path.extname(filename) === '.md';
      }).map(function(filename) {
        var src = path.resolve(this.paths.src, filename);
        return fs.readFileAsync(src).bind(this).then(function(contents) {
          return {
            tag      : tag,
            basename : path.basename(filename, '.md'),
            filenane : filename,
            pathname : path.resolve(this.paths.tmp, tag),
            contents : marked(contents.toString())
          };
        });
      });
    }).then(function(files) {
      this.files = files;
    });
  },

  writeFiles: function() {
    return Promise.bind(this).return(this.files).map(function(tag) {
      return Promise.bind(this).return(tag).map(function(file) {
        file.contents = this.template({
          content : file.contents,
          tags    : this.tags,
          file    : file,
          files   : tag
        });
        return mkdirp(file.pathname).return(file);
      }).map(function(file) {
        var dest = path.resolve(file.pathname, file.basename + '.html');
        return fs.writeFileAsync(dest, file.contents);
      });
    });
  },

  cleanup: function() {
    return Promise.bind(this).then(function() {
      return rimraf(this.paths.dest);
    }).then(function() {
      return fs.symlinkAsync(this.paths.tmp, this.paths.dest);
    }).then(function() {
      return fs.readdirAsync('./tmp');
    }).filter(function(dir) {
      dir = path.resolve('./tmp', dir);
      return fs.statAsync(dir).bind(this).then(function(stats) {
        return stats.isDirectory() && dir !== this.paths.tmp;
      });
    }).map(function(dir) {
      return rimraf(path.resolve('./tmp', dir));
    });
  },

  _readFile: function(file) {
    return fs.readFileAsync(path.resolve(file)).call('toString');
  },

  _readDir: function(dir) {
    return fs.readdirAsync(path.resolve(dir));
  },

  _writeFile: function(file, contents) {
    return fs.writeFileAsync(path.resolve(file), contents);
  }
});

var compiler = new Compiler();

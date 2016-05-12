var Promise      = require('bluebird');
var _            = require('underscore');
var path         = require('path');
var fs           = Promise.promisifyAll(require('fs'));
var Handlebars = require('handlebars');

module.exports = function(grunt) {

  grunt.config.merge({
    jsDocFiles: {
     docs: {
        options: {
        },

        files: [{
          expand: true,
          cwd: 'backbone.marionette/api',
          src: '*.jsdoc',
          dest: 'backbone.marionette/jsdoc',
          ext: '.json'
        }]
      }
    }
  });

  grunt.registerMultiTask('compileApi', function() {
    var options   = this.options();
    var files     = this.files[0];
    var task = new Task(grunt, options, files)
  });
}

/**
 * 1. run grunt api
 * 2. read the json for each jsdoc
 * 3. compile master json and write it to the api folder
 * 4. build the html files
 */

var Task = function(grunt, options, files) {
  this.options   = options;
  this.files = files;
  this.runJsDocFiles(grunt);
  this.buildJsonFile();
  this.buildHtmlFiles();
}

_.extend(Task.prototype, {
  runJsDocFiles: function(grunt) {
    grunt.task.run('jsDocFiles');
  },

  buildHtmlFiles: function() {
    var json = JSON.parse(fs.readFileSync(path.resolve(this.files.dest, 'api.json')));
    var classTpl = Handlebars.compile(fs.readFileSync(path.resolve(this.files.src[0], 'class.hbs')).toString());

    _.each(json.classes, function(klass) {
      var data = {
        marionette: json,
        klass: klass
      }

      var classHtml = classTpl(data);
      var classPath = path.resolve(this.files.dest, klass.name + '.html');

      console.log('writing ' + klass.name + ' api file.');

      fs.writeFile(classPath, classHtml, function(err) {
        if (err) {
          console.log('error', err);
        }
      })
    }, this)
  },

  buildJsonFile: function() {
    var jsdocPath = path.resolve(this.options.repo, "jsdoc");
    var files = fs.readdirSync(jsdocPath);
    var jsonFiles = _.map(files, function(filename) {
      var filepath =  path.resolve(jsdocPath, filename);
      var content = fs.readFileSync(filepath).toString();
      return JSON.parse(content);
    });

    var apiJson = {};
    apiJson.classes = [];
    apiJson.functions = {};
    apiJson.properties = {};

    _.each(jsonFiles, function(jsonFile) {
      if (_.has(jsonFile, 'class')) {
        apiJson.classes.push(jsonFile);
      } else {
        if (_.has(jsonFile, 'functions')) {
          _.extend(apiJson.functions, jsonFile.functions)
        }
        if (_.has(jsonFile, 'properties')) {
          _.extend(apiJson.properties, jsonFile.properties)
        }
      }
    });

    if (!fs.existsSync(path.resolve(this.files.dest))) {
      fs.mkdirSync(path.resolve(this.files.dest));
    }

    // console.log('json', apiJson);
    var apiFilePath = path.resolve(this.files.dest, 'api.json');
    fs.writeFileSync(apiFilePath, JSON.stringify(apiJson, null, '  '));
  }
});

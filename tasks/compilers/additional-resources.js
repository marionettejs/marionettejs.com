var path       = require('path');
var Promise    = require('bluebird');
var fs         = Promise.promisifyAll(require('fs'));
var https      = require('https');
var _          = require('underscore');
var mkdirp     = Promise.promisify(require('mkdirp'));
var rimraf     = Promise.promisify(require('rimraf'));
var mv         = Promise.promisify(require('mv'));
var CONSTS     = require('../consts');

var Compiler = function(paths) {
  this.paths = paths;
};

_.extend(Compiler.prototype, {
  /**
   * Compiles
   */
  compile: function () {
    return Promise.bind(this)
      .then(this.setup)
  },

  /**
   * Setups data
   */
  setup: function () {
    return Promise.all([
      mkdirp(this.paths.output)
    ]).bind(this)
      .then(function() {
        var resUrl = this.paths.resUrl;
        return new Promise(function(resolve, reject) {
          https.get(resUrl, function(response) {
            var buffer = '';
            response.on('data', function(chunk) {
              buffer += chunk;
            });
            response.on('end', function(err) {
              if (err) {
                reject(err);
              }
              resolve(buffer);
            });
          });
        });
      })
      .then(this.writeDataFiles)
  },

  /**
   * Writes data to files
   * @param {string} data
   */
  writeDataFiles: function (data) {
    var resourcesSections = this.getResourcesSections(data);
    return Promise.all(
      _.map(resourcesSections, function(value, index) {
        var res = this.listToArray(value);
        var distPath = path.join(this.paths.output, CONSTS.AR.TOPICS[index].FILE_NAME + '.json');
        return fs.writeFileSync(distPath, JSON.stringify(res, null, 4));
      }.bind(this))
    );
  },

  /**
   * Builds regexp for parsing resources
   * return {string}
   */
  buildRegExpForResources: function () {
    //pattern has to be like: '(##\\sGeneral|##\\sTutorials and articles)([^##]*)'
    return '(##\\\s' + _.pluck(CONSTS.AR.TOPICS, 'TITLE').join('|##\\\s') + ')([^##]*)';
  },

  /**
   * Gets resources divided by sections
   * @param {string} data
   * return {array}
   */
  getResourcesSections: function (data) {
    var myRegExp = new RegExp(this.buildRegExpForResources(), 'gm');
    return data.match(myRegExp);
  },

  /**
   * Makes array of object from list data
   * @param {string} data
   * return {array}
   *
   * Example
   * - [Building Backbone Plugins](https://leanpub.com/building-backbone-plugins) by Derick Bailey and Jerome Gravel-Niquet
   * - [Backbone.Marionette.js: A Gentle Introduction](https://leanpub.com/marionette-gentle-introduction) by David Sulc
   * - [Structuring Backbone Code with RequireJS and Marionette Modules](https://leanpub.com/structuring-backbone-with-requirejs-and-marionette) by David Sulc
   * - [Marionette Exposé](https://leanpub.com/marionetteexpose) by Jack Killilea
   * - [Backbone.Marionette.js: A Serious Progression](https://leanpub.com/marionette-serious-progression) by David Sulc
   * - [Getting Started with Backbone Marionette](http://www.amazon.com/dp/1783284250/) by Raymundo Armendariz and Arturo Soto
   * - [Marionette guides](https://www.gitbook.com/book/marionette/marionette-guides/details)
   *
   * Result
   * [
   *  {
   *    title: 'Building Backbone Plugins',
   *    link: 'https://leanpub.com/building-backbone-plugins'
   *  },
   *  {
   *    title: 'Backbone.Marionette.js: A Gentle Introduction',
   *    link: 'https://leanpub.com/marionette-gentle-introduction'
   *  }
   *
   *  etc.....
   *
   * ]
   */
  listToArray: function (data) {
    var myRegExp = new RegExp(/\[([^\]]+)\]\(([^)]+)\)/ig);
    var execData = data.match(myRegExp);
    var linksDataArray = [];
    for(var i = 0; i <= execData.length; i++) {
      myRegExp = new RegExp(/\[([^\]]+)\]\(([^)]+)\)/ig);
      var link = myRegExp.exec(execData[i]);
      if (link) {
        var linkData = {
          title: link[1],
          link: link[2]
        };
        linksDataArray.push(linkData);
      }
    }
    return linksDataArray;
  }
});

module.exports = Compiler;
var Promise    = require('bluebird');
var fs         = Promise.promisifyAll(require('fs'));
var path       = require('path');
var _          = require('underscore');
var swPrecache = require('sw-precache');
var packageJson = require('../../package.json');

var Compiler = function(config) {
  this.config = config;
};

_.extend(Compiler.prototype, {

  /**
   * Compiles task
   * @returns {Promise}
   */
  compile: function() {
    return Promise.bind(this)
      .then(this.writeSW);
  },

  /**
   * Writes service worker
   * @returns {Promise}
   */
  writeSW: function() {
    var config = {
      cacheId: packageJson.name,
      handleFetch: this.config.handleFetch,
      stripPrefix: this.config.rootDir + '/',
      verbose: true,

      staticFileGlobs: [
        this.config.rootDir + '/styles/**.css',
        this.config.rootDir + '/js/**.js',
        this.config.rootDir + '/**.html',
        this.config.rootDir + '/additional-resources/**.html',
        this.config.rootDir + '/annotated-src/**.html',
        //cache doc only for 2.4.x and 3 versions
        this.config.rootDir + '/docs/**.html',
        this.config.rootDir + '/docs/v2.4.**/**.html',
        this.config.rootDir + '/docs/v3.**/**.html',
        this.config.rootDir + '/docs/v4.**/**.html',
        this.config.rootDir + '/download/**.html',
        this.config.rootDir + '/inspector/**.html',
        this.config.rootDir + '/updates/**.html',
        this.config.rootDir + '/images/**/**.*',
        this.config.rootDir + '/*.{png,jpg,gif,svg}'
      ]
    };

    return swPrecache.write(path.join(this.config.rootDir, 'sw.js'), config);
  }
});


module.exports = Compiler;

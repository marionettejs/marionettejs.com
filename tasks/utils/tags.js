var _      = require('underscore');
var semver = require('semver');

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

module.exports = {
  sort: function(tags) {
    return tags.sort(function(v1, v2) {
      return semver.rcompare(remapInvalidTag(v1), remapInvalidTag(v2));
    });
  },
  valid: function(tags) {
    return _.chain(tags)
    .map(remapInvalidTag)
    .filter(_.partial(semver.lte, "v0.9.0"))
    .value();
  }
};
const test = require('ava');
const path = require('path');
const fs = require('fs');
const Compiler = require('../../tasks/compilers/additional-resources');
const parsedFileData = [
  {
    "title": "Building Backbone Plugins",
    "link": "https://leanpub.com/building-backbone-plugins"
  },
  {
    "title": "Backbone.Marionette.js: A Gentle Introduction",
    "link": "https://leanpub.com/marionette-gentle-introduction"
  },
  {
    "title": "Structuring Backbone Code with RequireJS and Marionette Modules",
    "link": "https://leanpub.com/structuring-backbone-with-requirejs-and-marionette"
  },
  {
    "title": "Marionette Exposé",
    "link": "https://leanpub.com/marionetteexpose"
  },
  {
    "title": "Backbone.Marionette.js: A Serious Progression",
    "link": "https://leanpub.com/marionette-serious-progression"
  },
  {
    "title": "Getting Started with Backbone Marionette",
    "link": "http://www.amazon.com/dp/1783284250/"
  },
  {
    "title": "Marionette guides",
    "link": "https://www.gitbook.com/book/marionette/marionette-guides/details"
  }
];

let fileData;
const compiler = new Compiler();

test.before(async t => {
  fileData = await fs.readFileSync('../fixtures/books.md', 'utf8');
});


test('Set config property for package.json', async t => {
  const data = compiler.listToArray(fileData);
  t.deepEqual(data, parsedFileData);
});
marionettejs.com
================

[![Gitter](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/marionettejs/marionettejs.com?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)

##### [Experimental](http://marionettejs.github.io/marionettejs.com/)

### Deving

> The Setup

    git clone git@github.com:marionettejs/marionettejs.com.git
    cd marionettejs.com
    bower install
    npm install
    git clone git@github.com:marionettejs/backbone.marionette.git

#### Deving the main WWW

    npm run dev

> Then open dist/index.html

#### Deploying the main WWW

    npm run deploy --version v2.X.X

#### Building the annotated source

    npm run compile-docco

#### Building the downloads

    npm run compile-downloads

#### Building the docs

  > Then we need to get the Marionette Repo to generate the build from:

      git clone git@github.com:marionettejs/backbone.marionette.git

  > Then we just have to compile:

      npm run compile-docs

  > Start up a static server

      python -m SimpleHTTPServer

  > Checkout some sweet docs

      http://localhost:8000/dist/docs/v2.2.0-pre/marionette.collectionview.html

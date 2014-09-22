marionettejs.com
================

##### [Experimental]

### Deving

> The Setup

    git clone git@github.com:thejameskyle/marionettejs.com.git
    cd marionettejs.com
    npm install

#### Deving the main WWW

    npm run dev

> Then open dist/index.html

#### Deploying the main WWW

    ./ship

#### Building the docs

  > Then we need to get the Marionette Repo to generate the build from:

      git clone git@github.com:marionettejs/backbone.marionette.git

  > Then we just have to compile:

      npm run compile

  > Start up a static server

      python -m SimpleHTTPServer

  > Checkout some sweet docs

      http://localhost:8000/dist/docs/v2.2.0-pre/marionette.collectionview.html
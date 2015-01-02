marionettejs.com
================

[![Gitter](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/marionettejs/marionettejs.com?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)

##### [Experimental](http://dev.marionettejs.com/)

### Deving

> The Setup

    git clone git@github.com:marionettejs/marionettejs.com.git
    cd marionettejs.com
    npm run setup

#### Deving the main WWW

    npm run dev
    cd dist && python -m SimpleHTTPServer

> Then visit localhost:8000

#### Deving the docs

    npm run dev
    npm run compile-docs (you will need to rerun this on template changes)

#### Deploying the main WWW

    npm run deploy

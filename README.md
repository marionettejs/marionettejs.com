marionettejs.com
================

[![Gitter](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/marionettejs/marionettejs.com?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)
[![Build Status](https://travis-ci.org/marionettejs/marionettejs.com.svg?branch=master)](https://travis-ci.org/marionettejs/marionettejs.com)

## Setup

To prep your repo, all you need to do is run our `setup` script.

    npm run setup
 
Create file `.env` in a root folder and in `test\compilers` with data:

```
AUTH_TOKEN='your_github_outh_token'
```
[Read more](https://github.com/motdotla/dotenv) about `.env`; 

After that, development should be easy! Use our `dev` task to get everything up and running:

    npm run dev

Then visit [http://localhost:8000](http://localhost:8000).

Site is using service worker ([sw-precache](https://github.com/GoogleChrome/sw-precache)), so it can be used in offline mode. All resources are cached during build.

> It uses YouTube and GitHub API for getting data dynamically.

## Compiling the docs

Working on the docs is just as easy as working on the website. Run the `dev` task as mentioned above but make sure you also compile the docs:

    npm run compile-docs

You'll need to rerun this command after template changes.

## When adding SVG

Follow [these steps](./svg-steps.md)

## Submitting PR

Before submitting pull request, please, run `npm test` and make sure that tests are not broken. 

marionettejs.com
================

[![Gitter](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/marionettejs/marionettejs.com?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)

[Staging Site](http://dev.marionettejs.com/)

## Setup

To prep your repo, all you need to do is run our `setup` script.

    npm run setup

After that, development should be easy! Use our `dev` task to get everything up and running:

    npm run dev

Then visit `[http://localhost:8000](http://localhost:8000)`.

## Compiling the docs

Working on the docs is just as easy as working on the website. Run the `dev` task as mentioned above but make sure you also compile the docs:

    npm run dev
    npm run compile-docs

You'll need to rerun this command after template changes.

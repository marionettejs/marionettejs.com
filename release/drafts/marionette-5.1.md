<!-- RELEASE-DAY DRAFT: not routed or included in the live news feed.
Publish only after npm 5.1.0, website/MCP parity, final date and hero approval. -->

# Marionette 5.1: Two more opinions.

**Meet `@mnjs/html` and `@mnjs/router`: templates and navigation built around Marionette’s Views, Regions, and Applications. Take what you need.**

Marionette 5 gave the framework an independent core. Marionette 5.1 gives you two more good choices for the application around it.

`@mnjs/html` handles templates and incremental DOM updates. `@mnjs/router` connects URLs to the features that own them. Both fit the structure Marionette already gives you: Views for presentation, Regions for placement and replacement, and Applications for coordinated work and lifetimes.

Both are optional. We remain opinionated about that, too.

## Templates that know whose View it is

`@mnjs/html` brings tagged HTML templates, incremental updates, keyed lists, and directives to Marionette applications. Its rendering engine is derived from Lit’s `lit-html`, with an integration built for Marionette-owned interfaces.

Write your template in JavaScript. Pass it data. Render when the View needs to change.

```js
import { Region, View, setDomApi } from 'marionette';
import { html } from '@mnjs/html';
import HtmlDomApi from '@mnjs/html/marionette';

setDomApi(HtmlDomApi);

const WelcomeView = View.extend({
  template: () => html`<h1>Hello, Marionette</h1>`,
});

new Region({ el: '#app' }).show(new WelcomeView());
```

The Region renders and mounts the View, then owns replacing and destroying it. As the interface grows, the same structure gives you places for child Views, repeated items, and cleanup.

Interactions stay in Marionette’s `events`, `triggers`, and `ui`. The renderer deliberately rejects template event bindings. You do not need two competing answers to “where did this click handler come from?”

The integration also carries attachment and detachment through to the renderer’s directives and keeps its updates within an owned DOM range. Your templates can do their work without taking over neighboring child Views.

For a new project with no renderer already chosen, this is now the recommended starting point. An existing application can keep its compatible renderer. There is no mandatory template migration hiding in the version number.

## Routes belong with the features

A URL tells you where the user wants to go. The application still needs to know what starts, what stays, and what gets cleaned up.

`@mnjs/router` brings those concerns together with named routes, feature-owned registrations, and selectable child Applications.

A Catalog feature can own `/catalog`. Its Item child can own the item page and the routes beneath it. Moving between an item’s sections can retain that item; choosing another item can restart the selected child with new parameters. The feature’s preparation and lifecycle remain part of its Application.

That gives a growing application a useful shape. Adding a feature does not require teaching one central routing file about every View, request, and cleanup operation in the system.

The Router also gives application code explicit navigation completion and cancellation outcomes. That makes it easier to coordinate loading, errors, and transitions without treating a changed URL as proof that the destination is ready.

It uses modern browser APIs and offers an explicitly selected History API driver. Read the [routing requirements](https://marionettejs.com/docs/guides/routing/) when choosing the setup for your application; current browser testing covers Chromium.

If your application already has a host router, keep it. Marionette can work inside that structure.

## A clearer path for you and your agent

The packages are useful individually. The documentation connects them.

The updated quick start begins with a real View and Region, then points into composed features, lists, local state, and routed Applications. The bundled agent skill follows those same paths and points to the installed contracts and verification guidance.

That matters whether you write the code yourself or review code an agent wrote. You should be able to find who owns the UI, where a feature prepares its data, and what happens when the user leaves.

The agent can generate plenty of JavaScript without our help. Giving it a sensible place to put that JavaScript is rather more interesting.

## Optional packages. Worth a minor release.

HTML and Router remain separate packages with their own versions. They do not become dependencies that every Marionette application must carry, and this release does not change core runtime APIs.

They do make the recommended Marionette stack more complete. That is worth **5.1**.

Start with the [quick start](https://marionettejs.com/docs/quick-start/), try [HTML templates](https://marionettejs.com/docs/packages/html/), or build a [routed feature](https://marionettejs.com/docs/packages/router/).

Take a small feature. Give it a View, a place to live, and somewhere to go.

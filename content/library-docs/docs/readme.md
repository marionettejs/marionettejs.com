# Marionette documentation

Start with the part of the interface you want to build. The same classes work
together as the application grows; you do not need to learn every integration
before showing your first View.

These repository guides describe the current v5 source. Published alphas may lag
behind it.

Start an [agent-led task](agents.md), or follow the guides directly. Both paths use
the same public contracts and examples.

## Build something

- [Install Marionette](installation.md) and show a first View.
- [Choose a class for the job](classes.md).
- [Build a screen with a View](marionette.view.md).
- [Show and replace a View in a Region](marionette.region.md).
- [Render a list with CollectionView](marionette.collectionview.md).
- [Share interactions with Behaviors](marionette.behavior.md).
- [Start and stop a feature with Application](marionette.application.md).

## Build and ship an application

- [Common application tasks](task-recipes.md): editable lists, navigation, widgets, and shared state.
- [TypeScript](typescript.md): type a consumer application using public exports.
- [Testing](testing.md): check behavior through the public interface.
- [Forms and accessibility](forms-and-accessibility.md): preserve drafts, labels, focus, and useful feedback.
- [Security](security.md): render untrusted content and identify application boundaries.
- [Production and performance](production-and-performance.md): prepare and measure the actual application.

## Connect the parts

- [Configuration and inheritance](basics.md)
- [Templates and rendering](view.rendering.md)
- [DOM interactions](dom.interactions.md)
- [Lifecycle and cleanup](view.lifecycle.md)
- [Events](events.md) and [Radio channels](radio.md)
- [State sources and observation](marionette.state.md)
- [Data and observable collections](data.api.md)
- [Routing](routing.md)

## Choose your integrations

Start with the [integration decision guide](choosing-integrations.md). Keep existing
choices that meet the task; select each adapter for its own capability.

- [Optional Backbone integration](optional-backbone.md)
- [The DOM API](dom.api.md)
- [Pre-rendered DOM](dom.prerendered.md)
- [Runtime isolation](runtime-isolation.md)

## Work with an agent

[Set up the consumer skill](agent-tools.md) to find documentation matching the
installed package. Record your project's choices in [application instructions](application-agent-template.md).
These are optional ways to use the same reference; a service is not required.

## Look up the details

- [Public exports and configuration](public-api.md)

- [Common class methods](common.md) and [utility exports](utils.md)
- [Class events](events.class.md) and [model and collection events](events.entity.md)
- [MnObject](marionette.mnobject.md)
- [Terminology](terminology.md)
- [Diagnostics](diagnostic-catalog.md)
- [v4-to-v5 compatibility ledger](migration-from-v4.md)
- [Upgrade guide](../upgradeGuide.md)
- [Contributing](https://github.com/marionettejs/marionette/blob/master/CONTRIBUTING.md), [performance baselines](https://github.com/marionettejs/marionette/blob/master/docs/performance-baselines.md),
  and the [release profile](https://github.com/marionettejs/marionette/blob/master/docs/release-profile.md)

The API reference is being reconciled for stable v5 in
[issue #147](https://github.com/marionettejs/marionette/issues/147). Until that
work is complete, do not treat the hosted `/docs/current` site as v5
documentation; it describes earlier releases.

For versions before v5, see the [backbone.marionette repository](https://github.com/marionettejs/backbone.marionette).

import { runtimeRelease } from '../scripts/release-contract.mjs';
import { demosInvitation } from './examples.mjs';
import { invitation } from './playground.mjs';
export { why } from './why.mjs';
import provenance from './provenance.json' with { type: 'json' };

if (provenance.packageVersion !== runtimeRelease) throw new Error(`Expected a Marionette 5 package version, received ${provenance.packageVersion}.`);

const demo = `<section class="demo application-demo" id="demo" aria-labelledby="demo-title">
  <div class="demo-heading"><span class="eyebrow" id="demo-title">APPLICATION / PREVIEW</span><span class="live-indicator">LIVE LIBRARY</span></div>
  <div id="application-slot"><p class="empty-region">Enable JavaScript to explore a small Marionette application.</p></div>
</section>`;

export const home = {title:`Marionette 5 — Structure for interactive JavaScript apps`,description:'A JavaScript UI library for interactive browser applications. Compose screens with Views and Regions, manage changing lists, and coordinate feature startup and cleanup.',active:'home',body:`
<div class="opening-act"><svg class="opening-thread" aria-hidden="true"><path/></svg>
<section class="night-hero">
  <div class="night-copy"><p class="eyebrow"><span class="signal-dot"></span> MARIONETTE ${provenance.packageVersion.split('.').slice(0, 2).join('.')}</p><h1>Build apps.<br><em>Keep control.</em></h1><p class="night-intro">A JavaScript UI library for<br><strong>interactive browser applications.</strong></p><p class="hero-purpose">Compose screens with Views and Regions.<br>Give changing lists and async work a clear owner.<br>Keep each part working as the app grows.</p><div class="night-actions"><a class="button" href="/demos/">Try the apps &amp; code <span aria-hidden="true">↗</span></a><a class="text-link" href="/docs/quick-start/">Build your first View →</a></div></div>
  <div class="rig" data-rig>
    <div class="rig-decoration" aria-hidden="true"><div class="rig-control"><span class="yoke-pin pin-left"></span><img src="/assets/mark.svg" width="68" height="70" alt=""><span class="yoke-pin pin-right"></span></div><svg class="rig-strings" viewBox="0 0 560 96" preserveAspectRatio="none"><path d="M84 0 V96 M476 0 V96"/><circle cx="84" cy="94" r="3"/><circle cx="476" cy="94" r="3"/></svg><span class="rig-annotation">A PLACE FOR EVERYTHING.</span></div>
    ${demo}
    <p class="rig-caption">One application. <span>Three independently changing parts.</span></p>
  </div>
  <div class="hero-bottom" aria-hidden="true"></div>
</section>
${invitation}
</div>
<section class="lifecycle-story" id="lifecycle" aria-labelledby="story-title" data-story>
 <div class="story-layout">
  <div class="story-copy"><p class="eyebrow">01 / A LIFECYCLE, ILLUSTRATED</p><h2 id="story-title">A good entrance.<br><em>A clean exit.</em></h2><p>Ask for a different panel. The Region replaces its View and cleans up the old one. Follow the change below.</p><div class="phase-controls" aria-label="Explore lifecycle stages"><button type="button" data-phase="0" aria-pressed="true" disabled>01 <span>Show</span></button><button type="button" data-phase="1" aria-pressed="false" disabled>02 <span>Replace</span></button><button type="button" data-phase="2" aria-pressed="false" disabled>03 <span>Empty</span></button></div><div class="sequence-actions"><button type="button" class="sequence-play" aria-label="Play the lifecycle" disabled>Play the lifecycle <span aria-hidden="true">▷</span></button><span>Or choose a step above.</span></div><code class="story-command" id="story-command">region.show(notes);</code><p class="phase-description" id="phase-description">The Region renders and attaches its current View.</p><output class="lifecycle-events" id="lifecycle-events" aria-label="Observed lifecycle events" hidden></output><a class="text-link" href="/docs/api/region/">The contract your agent reads →</a></div>
  <div class="ownership-scene" data-phase="0" role="img" aria-label="Lifecycle illustration: a Region displays NotesView.">
   <div class="scene-floor"></div><div class="owner-node"><span class="signal-dot"></span> Region <code>preview</code></div><div class="ownership-thread"></div>
   <div class="lifecycle-slot"><div class="diagram-view old-view"><span>VIEW / 01</span><strong>NotesView</strong><div class="skeleton"><i></i><i></i><i></i></div><small>rendered → attached</small></div></div>
   <div class="empty-boundary"><span>Nothing here.</span><small>The Region is ready for another View.</small></div><div class="exit-receipt"><span>✓</span> <span data-receipt>Previous View destroyed</span></div><span class="scene-label">OWNERSHIP IS A RELATIONSHIP.<br>LEAVING IS PART OF IT.</span>
  </div>
 </div>
</section>
<section class="ownership" id="ownership" aria-labelledby="structure-title">
 <div class="structure-copy"><p class="eyebrow">02 / A PLACE FOR THE WHOLE APPLICATION</p><h2 id="structure-title">Give every part<br><span>a place to work.</span></h2><p>Screens, changing lists, and work that starts and stops with a feature. Each gets a clear owner you can build on. Start new apps with <code>@mnjs/html</code> for incremental templates, then compose them with Views, Regions and CollectionViews.</p><a class="text-link" href="/why/">Build on that structure →</a></div>
 <figure class="structure-map" aria-label="Example application structure: an Application owns a child Application, which displays a screen View. The screen has list and detail Regions. A CollectionView owns the list's row Views. A Behavior adds reusable interaction to the screen.">
  <div class="structure-app"><div class="structure-heading"><span class="signal-dot"></span><strong>Application</strong><small>start → stop</small></div>
   <div class="structure-feature"><div class="structure-feature-heading"><strong>Workspace</strong><span>child Application</span></div>
    <div class="structure-screen"><div class="structure-screen-heading"><strong>View</strong><span>the screen</span></div>
     <div class="structure-regions">
      <div class="structure-region"><span class="structure-region-label">REGION <b>list</b></span><div class="structure-collection"><strong>CollectionView</strong><div class="structure-rows" aria-hidden="true"><span>View <i></i></span><span>View <i></i></span><span>View <i></i></span></div></div></div>
      <div class="structure-region"><span class="structure-region-label">REGION <b>detail</b></span><div class="structure-detail"><strong>View</strong><span aria-hidden="true">A closer look.</span><i aria-hidden="true"></i><i aria-hidden="true"></i></div></div>
     </div>
     <div class="structure-behavior"><span aria-hidden="true">↳</span><strong>Behavior</strong><span>shared interaction</span></div>
    </div>
   </div>
  </div>
  <figcaption><span>State + events</span><span>Keep the pieces talking.</span></figcaption>
 </figure>
</section>
<section class="night-honesty" aria-labelledby="honesty-title"><p class="eyebrow">03 / BUILT FOR THE NEXT REQUEST</p><h2 id="honesty-title">Build a feature.<br>Change your mind.<br><em>Keep going.</em></h2><div><p>That list needs a filter. The editor should keep its draft. A second feature needs the same data.</p><p>Marionette gives each change a clear owner. Views handle interaction, Regions manage changing panels, and Applications coordinate work across a feature. You can follow the result and direct what happens next.</p><p>See that workflow in the RealWorld case study: an agent-built Conduit application, three development stages, and measured comparisons with other implementations.</p><a class="text-link" href="/case-studies/realworld/">Read the RealWorld case study →</a></div><span class="honesty-mark" aria-hidden="true">*</span></section>
<section class="night-closing" aria-labelledby="v5-title"><p class="eyebrow">YES, THAT MARIONETTE.</p><h2 id="v5-title">A familiar name.<br><em>Fewer strings attached.</em></h2><p>An independent core. HTML templates. Your choice of data and integrations.</p><a class="text-link" href="/why/#integrations">Pick your tools <span aria-hidden="true">↗</span></a></section>
${demosInvitation}
<section class="home-support" aria-labelledby="home-support-title">
 <div><p class="eyebrow">OPEN SOURCE / HUMAN MAINTAINED</p><h2 id="home-support-title">A little help behind the strings.</h2><p>Support the maintenance, docs, and releases through GitHub Sponsors.<br>Or put your very specific taste in JavaScript on a T-shirt.</p><a class="text-link" href="/thanks/">Meet the people and tools behind Marionette →</a></div>
 <div class="support-actions"><a class="button" href="https://github.com/sponsors/paulfalgout">Sponsor Marionette <span aria-hidden="true">↗</span></a><a class="text-link" href="https://store.marionettejs.com/">Browse the merch store <span aria-hidden="true">↗</span></a></div>
</section>`};

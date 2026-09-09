const tools = [
  ['OpenAI', 'https://openai.com/', 'For ChatGPT credits supporting Marionette’s open-source development.'],
  ['GitHub &amp; Copilot', 'https://github.com/features/copilot', 'For Copilot access and credits, plus GitHub’s repository hosting and CI.'],
  ['CodeRabbit', 'https://www.coderabbit.ai/', 'For automated reviews that help find what a convincing diff can hide.'],
  ['cubic', 'https://www.cubic.dev/', 'For another careful pass over changes and their consequences.'],
  ['Greptile', 'https://www.greptile.com/', 'For code review and an extra set of questions before a change lands.'],
  ['Cloudflare', 'https://developers.cloudflare.com/pages/', 'For free website hosting and DNS that help keep Marionette available.']
];

export const thanks = {
  title: 'Thanks & support — Marionette',
  description: 'Support Marionette on Patreon, browse the merch store, and meet the people and tools behind the open-source JavaScript library.',
  active: 'thanks',
  body: `
<section class="article-heading thanks-heading">
  <p class="eyebrow">THANKS &amp; SUPPORT</p>
  <h1>Marionette<br><em>thanks you.</em></h1>
  <p>A few strings. A lot of people behind them.</p>
</section>
<div class="thanks-sections">
  <section class="thanks-section" id="support" aria-labelledby="support-title">
    <div class="thanks-label"><span class="eyebrow">01 / SUPPORTERS</span><span class="thanks-star" aria-hidden="true">✳</span></div>
    <div class="thanks-content">
      <h2 id="support-title">Help with what comes next.</h2>
      <p>Support on Patreon helps make time for maintenance, documentation, and whatever the next browser breaks.</p>
      <p>Marionette is free and open source. If it’s useful to you, helping sustain the work is a lovely way to say so.</p>
      <p>Become a String Puller, or be Suspiciously Helpful. Both memberships support the same project. Development updates are public; recognition here is optional.</p>
      <a class="button" href="https://www.patreon.com/marionettejs">Support on Patreon <span aria-hidden="true">↗</span></a>
      <!-- Add supporters here when there are confirmed names and permission to display them. -->
    </div>
  </section>
  <section class="thanks-section" id="merch" aria-labelledby="merch-title">
    <div class="thanks-label"><span class="eyebrow">02 / WE MADE MERCH</span></div>
    <div class="thanks-content">
      <h2 id="merch-title">The abstractions have sleeves.</h2>
      <p>We put a JavaScript library’s logo on things. This is apparently a decision we’re standing by.</p>
      <a class="merch-art" href="https://store.marionettejs.com/" aria-label="Browse the Marionette merch store"><img src="/assets/store-header.png" width="1920" height="800" loading="lazy" decoding="async" alt="Marionette hoodies, a T-shirt, cap, mug, and stickers hanging from red puppet strings."></a>
      <p>Marionette is still free. The hoodie has a slightly different business model.</p>
      <a class="text-link" href="https://store.marionettejs.com/">Browse the merch store <span aria-hidden="true">↗</span></a>
    </div>
  </section>
  <section class="thanks-section" id="tools" aria-labelledby="tools-title">
    <div class="thanks-label"><span class="eyebrow">03 / A LITTLE HELP</span></div>
    <div class="thanks-content">
      <h2 id="tools-title">Keeping the strings attached.</h2>
      <p>Marionette thanks the teams providing credits, tools, and services that support the work—and help check it.</p>
      <ul class="thanks-tools">${tools.map(([name, url, description]) => `<li><h3><a href="${url}">${name} <span aria-hidden="true">↗</span></a></h3><p>${description}</p></li>`).join('')}</ul>
    </div>
  </section>
  <section class="thanks-section" id="people" aria-labelledby="people-title">
    <div class="thanks-label"><span class="eyebrow">04 / THE PEOPLE</span></div>
    <div class="thanks-content">
      <h2 id="people-title">The people behind Marionette.</h2>
      <p>Thank you to Marionette’s maintainers for carrying the project forward through each release.</p>
      <p>And to everyone who has contributed code, reported a bug, written an example, or helped someone understand it: your work is part of Marionette too.</p>
      <a class="text-link" href="https://github.com/orgs/marionettejs/people">Meet the Marionette maintainers <span aria-hidden="true">↗</span></a>
    </div>
  </section>
</div>`
};

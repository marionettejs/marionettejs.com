let track = () => false;
Promise.all([import('./analytics.js'), import('./analytics-config.js')]).then(([tracker, { analyticsConfig }]) => {
  track = tracker.track;
  if (analyticsConfig.projectKey && analyticsConfig.cookielessServerHashConfirmed && tracker.analyticsAllowed()) {
    import('./analytics-posthog.js').then(({ initializePostHog }) => {
      if (initializePostHog(analyticsConfig)) track('page_view');
    }).catch(() => {});
  }
}).catch(() => {});
// Privacy controls work even if optional analytics modules fail to load.
function setAnalyticsOptOut(value) {
  try {
    if (value) {
      localStorage.setItem('marionette-analytics-opt-out', '1');
      dispatchEvent(new Event('marionette-analytics-opt-out'));
    } else localStorage.removeItem('marionette-analytics-opt-out');
    return true;
  } catch { return false; }
}
for (const button of document.querySelectorAll('[data-analytics-opt-out]')) {
  button.addEventListener('click', () => {
    const optingOut = button.dataset.analyticsOptOut === 'true';
    const saved = setAnalyticsOptOut(optingOut);
    document.querySelector('#analytics-choice-status').textContent = saved ? (optingOut ? 'Preference saved. PostHog analytics is off in this browser for this website address.' : 'Preference saved. Reload pages to allow PostHog analytics when configured; browser privacy signals are still respected.') : 'This browser could not save the preference. DNT and Global Privacy Control are also respected.';
  });
}

if (document.querySelector('#application-slot')) {
  import('./demo.js').catch(() => {
    document.querySelector('#application-slot').textContent = 'The application example could not load. You can still explore the lifecycle illustration below and read the guide.';
  });
}
if (document.querySelector('[data-story]')) {
  import('./motion.js').catch(() => {
    document.documentElement.classList.add('motion-off');
  });
}

if (document.querySelector('#playground')) {
  import('./playground.js').catch(() => {
    document.querySelector('#invitation-status').textContent = 'The workshop could not load. The agent brief is still available below.';
  });
}

const adoptionPrompt = document.querySelector('#adoption-prompt');
if (adoptionPrompt) {
  adoptionPrompt.value = adoptionPrompt.value.replace('[page URL]', new URL('/why/', location.href).href).replace('[review brief URL]', new URL('/adoption-review.md', location.href).href);
  const copy = document.querySelector('#copy-adoption-prompt');
  const status = document.querySelector('#adoption-copy-status');
  copy.hidden = false;
  copy.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(adoptionPrompt.value);
      track('adoption_copy');
      status.textContent = 'Copied. Give it to the agent that knows your project.';
    } catch {
      document.querySelector('#adoption-prompt-details').open = true;
      adoptionPrompt.focus();
      adoptionPrompt.select();
      status.textContent = 'Select and copy the prompt below.';
    }
  });
}

if (document.querySelector('#examples')) {
  import('./examples.js').catch(() => {
    document.querySelector('#example-status').textContent = 'Examples could not load. The documentation links are still available.';
  });
}

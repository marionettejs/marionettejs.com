if (document.querySelector('#application-slot')) {
  import('./demo.js').catch(() => {
    document.querySelector('#demo-status').textContent = 'The application example could not load. You can still explore the lifecycle illustration below.';
    document.querySelector('#application-slot').textContent = 'Read the guide to explore Views and Regions.';
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
      status.textContent = 'Copied. Give it to the agent that knows your project.';
    } catch {
      document.querySelector('#adoption-prompt-details').open = true;
      adoptionPrompt.focus();
      adoptionPrompt.select();
      status.textContent = 'Select and copy the prompt below.';
    }
  });
}

const selector = document.querySelector('#agent-client');
if (selector) {
  const sections = document.querySelectorAll('[data-agent-client]');
  const selectClient = () => {
    for (const section of sections) section.hidden = section.dataset.agentClient !== selector.value;
  };
  selector.addEventListener('change', selectClient);
  selectClient();
  selector.parentElement.hidden = false;

  for (const pre of document.querySelectorAll('.agent-setup pre')) {
    const code = pre.querySelector('code');
    const controls = document.createElement('div');
    controls.className = 'agent-copy-controls';
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = 'Copy';
    const client = pre.closest('[data-agent-client]')?.getAttribute('aria-label') || 'package setup';
    button.setAttribute('aria-label', `Copy ${client}: ${code.textContent.split('\n')[0]}`);
    const status = document.createElement('span');
    status.setAttribute('role', 'status');
    button.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(code.textContent.trimEnd());
        status.textContent = 'Copied.';
      } catch {
        status.textContent = 'Copy unavailable. Select the command below to copy it.';
        const selection = window.getSelection();
        const range = document.createRange();
        range.selectNodeContents(code);
        selection.removeAllRanges();
        selection.addRange(range);
      }
    });
    controls.append(button, status);
    pre.before(controls);
  }
}

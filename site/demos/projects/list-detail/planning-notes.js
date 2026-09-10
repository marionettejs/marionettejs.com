import { View } from 'marionette';

const PlanningNotes = View.extend({
  createState() {
    return {
      draft: '',
    };
  },
  template: () => `
    <label for="draft">Your unsaved master plan</label>
    <input id="draft" placeholder="First, find the list. Then, a biscuit." autocomplete="off">
    <p class="fine">Experiment shortcut: Enter adds/removes a test task in the other Region. Keep typing to check that this input and its cursor survived.</p>
  `,
  ui: {
    draft: '#draft',
  },
  events: {
    'input @ui.draft': 'onInputDraft',
    'keydown @ui.draft': 'onKeydownDraft',
  },
  onInputDraft({ delegateTarget }) {
    this.getState().draft = delegateTarget.value;
  },
  onKeydownDraft(event) {
    if (event.key !== 'Enter') {
      return;
    }
    event.preventDefault();
    this.triggerMethod('press:enter');
  },
});

export { PlanningNotes };

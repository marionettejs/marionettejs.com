import { View, Application } from 'marionette';
import { FlightDeck } from './flight.js';
import { animateHangar } from './motion.js';
import { html } from '@mnjs/html';

// Application readiness is a different boundary: there is no flight screen
// until preparation succeeds. Stop cancels this start; failure rejects it.
const PreparationStatus = View.extend({
  tagName: 'p',
  className: 'station-status',
  attributes: {
    role: 'status',
  },
  template: ({ message }) => html`${message}`,
});
const StationLoader = View.extend({
  regions: {
    status: '.station-status-slot',
  },
  onRender() {
    this.showStatus(this.model.message);
  },
  showStatus(message) {
    this.showChildView(
      'status',
      new PreparationStatus({
        model: {
          message,
        },
      }),
    );
  },
  advance() {
    this.step = Math.min(this.step + 1, 4);
    this.animations.forEach(animation => {
      if (this.step === 4) {
        animation.finish();
      } else {
        animation.currentTime = this.step * 250;
      }
    });
    this.showStatus(
      'OPENING. ' +
        this.step * 25 +
        '% · step ' +
        this.step +
        '/4. Readiness waits for all four steps.',
    );
    return this.step;
  },
  ui: {
    doors: '.hangar-door',
  },
  template: ({ phase, message }) => html`
    <section class="station-loader" data-phase="${phase}">
      <div class="hangar" aria-label="Ship waiting for the hangar to open">
        <span class="hangar-ship" aria-hidden="true">🚀</span>
        <div class="hangar-door"></div><div class="hangar-door"></div>
        <span class="hangar-sign">CHEESE COURIER · LAUNCH BAY</span>
      </div>
      <div class="station-status-slot"></div>
    </section>`,
  prepare(signal) {
    this.animations = animateHangar(this.getUI('doors'));
    // This paused timeline is a progress ruler, not a countdown.
    this.step = 0;
    this.animations.forEach(animation => {
      animation.pause();
      animation.currentTime = 0;
    });
    this.advance();
    const cancel = () => this.cancelPreparation();
    signal.addEventListener('abort', cancel, {
      once: true,
    });
    return Promise.all(this.animations.map(animation => animation.finished)).finally(() =>
      signal.removeEventListener('abort', cancel),
    );
  },
  cancelPreparation() {
    this.animations?.forEach(animation => animation.cancel());
  },
  fail() {
    this.cancelPreparation();
  },
  onBeforeDestroy() {
    this.cancelPreparation();
  },
});
const MissionControl = Application.extend({
  createState() {
    return {
      readinessWrites: 0,
      starts: 0,
      signal: null,
    };
  },
  async prepareStart({ loader }, { signal }) {
    this.getState().signal = signal;
    try {
      await loader.prepare(signal);
      if (signal.aborted) {
        return;
      }
      this.getState().readinessWrites++;
    } catch (error) {
      if (signal.aborted) {
        return;
      }
      throw new Error('The antenna fell into the cheese');
    }
  },
  onStart() {
    this.getState().starts++;
    this.showView(new FlightDeck());
  },
});
const StationControls = View.extend({
  className: 'controls',
  ui: {
    open: '#open-station',
    close: '#close-station',
    fail: '#fail-preparation',
    destroy: '#destroy-station',
    reset: '#reset-station',
    exploration: '.station-more > summary',
  },
  triggers: {
    'click @ui.open': 'click:open',
    'click @ui.close': 'click:close',
    'click @ui.fail': 'click:failPreparation',
    'click @ui.destroy': 'click:destroy',
    'click @ui.reset': 'click:reset',
  },
  events: {
    'click @ui.exploration': 'onClickExploration',
  },
  onClickExploration() {
    this.model.exploring = !this.model.exploring;
    this.triggerMethod('toggle:exploration', this.model.exploring);
  },
  template: ({ phase, exploring, preparationStep }) => html`
    <button id="open-station" ?disabled=${['open', 'destroyed'].includes(phase)}>${phase === 'open' ? 'Hangar open' : 'Open hangar · ' + preparationStep + '/4'}</button>
    <details class="station-more" ?open=${exploring}><summary>Explore the whole station’s lifetime</summary>
    <p class="fine">Compare cancellation with failure. Closing a ready station also destroys its root View and any ship it owns.</p>
    <button id="close-station" ?disabled=${!['opening', 'open'].includes(phase)}>${phase === 'opening' ? 'Cancel opening' : 'Close station'}</button>
    <button id="fail-preparation" ?disabled=${phase !== 'opening'}>Break the antenna</button>
    <button id="destroy-station" ?disabled=${phase === 'destroyed'}>Destroy station</button></details>
    <button id="reset-station" ?hidden=${phase !== 'destroyed'}>Reset Cheese Patrol</button>`,
});
const MissionChapters = View.extend({
  className: 'mission-chapters',
  template: ({ chapter, ready }) => html`
    <button class="readiness-chapter" aria-pressed="${chapter === 1}">1. When may the app appear?</button>
    <button class="flight-chapter" aria-pressed="${chapter === 2}" ?disabled=${!ready}>2. What happens to unfinished work?</button>`,
  ui: {
    readiness: '.readiness-chapter',
    flight: '.flight-chapter',
  },
  triggers: {
    'click @ui.readiness': 'select:readiness',
    'click @ui.flight': 'select:flight',
  },
});

export { MissionControl, StationLoader, StationControls, MissionChapters };

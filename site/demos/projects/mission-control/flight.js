import { View } from 'marionette';
import { animateFlight } from './motion.js';
import { escapeHTML } from './html.js';

// Region replacement destroys the old Mission. Its owned AbortController
// cancels the flight; only successful completion updates the View's state.
const flightDuration = 3000;
const beamWindow = {
  start: 0.4,
  end: 0.6,
};
function flightContext({ progress, status, commits }) {
  const outcomes = {
    ready: ['🚀', 'Ready on the launchpad. Three seconds to the moon.'],
    flying: ['🚀', 'In flight. The moon has ordered extra cheese.'],
    landed: ['🧀', 'Delivered! One cheese write. Zero interplanetary invoices paid.'],
    failed: ['💥', 'Engine failed. No cheese delivered. Try a fresh mission.'],
    retired: ['🚀', `Retired: ${commits} deliveries. This flight cannot do more work.`],
  };
  const [icon, message] = outcomes[status];
  return {
    icon,
    message,
    left: 10 + 80 * progress,
  };
}
const flightTemplate = ({ left, icon, message }) => `
  <div class="flight-path">
    <span class="planet earth">🌍</span>
    <div class="beam-zone" aria-hidden="true"></div>
    <span class="beam-cannon" aria-hidden="true">📡</span>
    <small class="beam-label">BEAM ZONE · 40–60%</small>
    <span class="rocket" aria-label="Cheese delivery rocket"
      style="left:${left}%;transform:translateX(-50%) rotate(45deg)">${icon}</span>
    <span class="planet moon">🌕</span>
  </div>
  <p class="result" role="status">${message}</p>`;
const Mission = View.extend({
  ui: {
    rocket: '.rocket',
  },
  createState() {
    return {
      controller: new AbortController(),
      commits: 0,
      status: 'flying',
      progress: 0,
    };
  },
  templateContext() {
    return flightContext(this.getState());
  },
  template: flightTemplate,
  // An explicit background task, started by FlightDeck after region.show.
  // View lifecycle hooks remain synchronous; they do not await this Promise.
  async fly({ guided = false } = {}) {
    const state = this.getState();
    const [rocket] = this.getUI('rocket');
    this.animation = animateFlight(rocket, {
      duration: flightDuration,
      guided,
      onPause: () => this.triggerMethod('pause:flight'),
    });
    const cancel = () => this.animation.cancel();
    state.controller.signal.addEventListener('abort', cancel, {
      once: true,
    });
    try {
      await this.animation.finished;
      if (state.controller.signal.aborted || this.isDestroyed()) {
        return;
      }
      Object.assign(state, {
        commits: state.commits + 1,
        status: 'landed',
        progress: 1,
      });
    } catch (error) {
      if (state.controller.signal.aborted) {
        return;
      }
      if (state.status !== 'failed') {
        throw error;
      }
    } finally {
      state.controller.signal.removeEventListener('abort', cancel);
    }
    this.animation.cancel();
    this.render();
    this.triggerMethod('settle:flight', this);
  },
  getProgress() {
    return ['running', 'paused'].includes(this.animation?.playState)
      ? this.animation.currentTime / flightDuration
      : this.getState().progress;
  },
  snapshot() {
    const state = this.getState();
    const progress = this.getProgress();
    return {
      progress,
      commits: state.commits,
      status: 'retired',
    };
  },
  fail() {
    const state = this.getState();
    if (state.status !== 'flying') {
      return;
    }
    Object.assign(state, {
      progress: this.snapshot().progress,
      status: 'failed',
    });
    this.animation.cancel();
  },
  onBeforeDestroy() {
    this.getState().controller.abort();
  },
});
const RetiredFlight = View.extend({
  className: 'retired-flight',
  templateContext() {
    return flightContext(this.model);
  },
  template: model =>
    '<small>RETIRED FLIGHT — frozen at the moment its View left</small>' + flightTemplate(model),
});
// The beam is a sibling View, so its flash survives a hit destroying the ship.
const Beam = View.extend({
  className: 'beam',
  template: () => '',
  flash() {
    this.animation = this.el.animate(
      [
        {
          opacity: 1,
        },
        {
          opacity: 0,
        },
      ],
      {
        duration: 500,
        fill: 'forwards',
      },
    );
  },
  onBeforeDestroy() {
    this.animation?.cancel();
  },
});
const BeamFeedback = View.extend({
  className: 'beam-feedback',
  attributes: {
    role: 'status',
  },
  template: ({ message }) => escapeHTML(message),
});
const FlightControls = View.extend({
  className: 'controls',
  createState() {
    return {
      exploring: false,
    };
  },
  templateContext() {
    return this.getState();
  },
  events: {
    'click @ui.exploration': 'onClickExploration',
  },
  onClickExploration() {
    this.getState().exploring = !this.getState().exploring;
  },
  template: ({
    flying,
    exploring,
    paused,
  }) => `<button id="guided-flight">Guided flight · pause halfway</button>
    <button id="cancel-flight" ${paused ? '' : 'disabled'}>Cancel this flight</button>
    <p class="fine flight-game-label">Or play: launch a three-second courier and time your beam.</p>
    <button id="launch-worker">Launch / restart 🚀</button>
    <button id="fire-beam" ${flying ? '' : 'disabled'}>Fire beam ⚡</button>
    <details class="flight-more" ${exploring ? 'open' : ''}><summary>Try an engine failure</summary><button id="fail-worker" ${flying ? '' : 'disabled'}>Break the engine 💥</button></details>`,
  ui: {
    guided: '#guided-flight',
    cancel: '#cancel-flight',
    launch: '#launch-worker',
    beam: '#fire-beam',
    fail: '#fail-worker',
    exploration: '.flight-more > summary',
  },
  triggers: {
    'click @ui.guided': 'click:guidedFlight',
    'click @ui.cancel': 'click:cancelFlight',
    'click @ui.launch': 'click:launch',
    'click @ui.beam': 'click:fireBeam',
    'click @ui.fail': 'click:breakEngine',
  },
});
const FlightDeck = View.extend({
  className: 'flight-deck',
  template: () => `
    <div class="flight-arena">
      <div class="slot flight-slot">${flightTemplate(
        flightContext({
          progress: 0,
          status: 'ready',
          commits: 0,
        }),
      )}</div>
      <div class="beam-slot"></div>
    </div>
    <div class="controls-slot"></div><div class="feedback-slot"></div>

  `,
  regions: {
    worker: '.slot',
    beam: '.beam-slot',
    feedback: '.feedback-slot',
    controls: '.controls-slot',
  },
  childViewEvents: {
    'click:guidedFlight': 'onClickGuidedFlight',
    'click:cancelFlight': 'onClickCancelFlight',
    'click:launch': 'onClickLaunch',
    'click:fireBeam': 'onClickFireBeam',
    'click:breakEngine': 'onClickBreakEngine',
  },
  childViewTriggers: {
    'pause:flight': 'pause:flight',
    'settle:flight': 'settle:flight',
  },
  onRender() {
    this.showChildView(
      'controls',
      new FlightControls({
        model: { flying: false, paused: false },
      }),
    );
  },
  retire() {
    const old = this.getChildView('worker');
    if (!old) {
      return;
    }
    this.triggerMethod('retire:flight', old);
  },
  onClickGuidedFlight() {
    this.launch({ guided: true });
  },
  onClickLaunch() {
    this.launch({ guided: false });
  },
  launch({ guided }) {
    this.retire();
    this.getRegion('beam').empty();
    this.feedback(
      guided
        ? 'The ship will pause at 50%. Its Promise will still be pending.'
        : 'Aim for the marked lane: 40–60% of the flight.',
    );
    this.current = new Mission();
    this.showChildView('worker', this.current);
    this.triggerMethod('launch:flight', this.current);
    this.current
      .fly({
        guided,
      })
      .catch(error => this.triggerMethod('fail:flight', error));
    this.updateControls({ flying: true });
  },
  onPauseFlight() {
    this.updateControls({ flying: true, paused: true });
    this.feedback(
      'Paused at 50%. The View is alive, the Promise is pending, and deliveries are still zero. Click Cancel this flight when you are ready.',
    );
  },
  onClickCancelFlight() {
    this.cancelFlight();
  },
  onClickFireBeam() {
    const mission = this.getChildView('worker');
    const progress = mission.getProgress();
    const beam = new Beam();
    this.showChildView('beam', beam);
    beam.flash();
    if (progress >= beamWindow.start && progress <= beamWindow.end) {
      this.triggerMethod('hit:flight', progress);
    } else {
      this.triggerMethod('miss:flight', progress);
    }
  },
  onMissFlight(progress) {
    this.feedback(
      `Miss at ${Math.round(progress * 100)}%. The ship keeps flying. Fire between 40% and 60%.`,
    );
  },
  feedback(message) {
    this.showChildView(
      'feedback',
      new BeamFeedback({
        model: {
          message,
        },
      }),
    );
  },
  onHitFlight(progress) {
    this.cancelFlight();
    this.feedback(
      `Hit at ${Math.round(progress * 100)}%! View destroyed. Flight aborted. Zero cheese delivered.`,
    );
  },
  cancelFlight() {
    this.retire();
    this.getRegion('worker').empty();
    this.updateControls({ flying: false });
    this.triggerMethod('cancel:flight');
    this.feedback(
      'View destroyed. Flight aborted. Zero cheese delivered. The station is still running.',
    );
  },
  onClickBreakEngine() {
    this.current.fail();
  },
  updateControls({ flying, paused = false }) {
    const controls = this.getChildView('controls');
    Object.assign(controls.model, { flying, paused });
    controls.render();
  },
  onSettleFlight() {
    this.updateControls({ flying: false });
  },
});

export { Mission, FlightDeck, RetiredFlight };

import { View } from 'marionette';
import { Model, StateApi } from '@mnjs/data';
import { RadioWidget } from './motion.js';

// Start with Radio: its Regions own the controls and readout.
// RadioWidget in motion.js owns animation and the external subscription.
const RadioReadout = View.extend({
  template: ({ frames, deliveries }) =>
    `<small class="radio-frames">${frames} animation frames</small><p class="widget">📡 Broadcasts heard: ${deliveries}</p>`,
});
const RadioTuner = View.extend({
  createState() {
    return new Model({
      playing: true,
      frequency: 4,
    });
  },
  stateEvents: {
    'change:playing': 'render',
  },
  templateContext() {
    return this.getState().toObject();
  },
  template: ({
    playing,
    frequency,
  }) => `<label class="tuning">Tune the wiggles <input type="range" min="1" max="9" value="${frequency}" aria-label="Radio frequency"></label>
    <button class="pause-radio">${playing ? 'Pause' : 'Resume'} the radio</button>`,
  ui: {
    frequency: '[type=range]',
    pause: '.pause-radio',
  },
  events: {
    'input @ui.frequency': 'onInputFrequency',
  },
  triggers: {
    'click @ui.pause': 'click:playback',
  },
  onInputFrequency({ delegateTarget }) {
    const frequency = Number(delegateTarget.value);
    this.getState().set('frequency', frequency);
    this.triggerMethod('change:frequency', frequency);
  },
  onClickPlayback() {
    const state = this.getState();
    state.set('playing', !state.get('playing'));
    this.triggerMethod('change:playback');
  },
});
RadioTuner.setStateApi(StateApi);
const Radio = View.extend({
  template:
    () => `<div class="radio-display"><div class="radio-dial">📻 &nbsp; FM 404 · SIGNAL FOUND</div>
    <div class="equalizer" aria-label="Live radio waveform">${'<i></i>'.repeat(9)}</div><div class="readout"></div></div><div class="tuner"></div>`,
  ui: {
    bars: '.equalizer i',
  },
  regions: {
    readout: '.readout',
    tuner: '.tuner',
  },
  childViewEvents: {
    'change:frequency': 'onChangeFrequency',
    'change:playback': 'onChangePlayback',
  },
  onRender() {
    this.showChildView(
      'readout',
      new RadioReadout({
        model: {
          frames: 0,
          deliveries: 0,
        },
      }),
    );
    this.showChildView('tuner', new RadioTuner());
  },
  onAttach() {
    // The tuner belongs to the View and survives detach/reattach.
    // The external widget runs only while the View is attached.
    const settings = this.getChildView('tuner').getState().toObject();
    this.widget = new RadioWidget({
      bars: this.getUI('bars'),
      ...settings,
    });
    this.listenTo(this.widget, 'render:frame', this.onRenderFrame);
    this.listenTo(this.widget, 'receive:broadcast', this.onReceiveBroadcast);
    this.widget.start();
    this.renderReadout();
  },
  onRenderFrame() {
    this.renderReadout();
  },
  onReceiveBroadcast() {
    this.renderReadout();
  },
  renderReadout() {
    const readout = this.getChildView('readout');
    readout.model = this.widget.getState();
    readout.render();
  },
  onChangeFrequency(frequency) {
    this.widget.tune(frequency);
  },
  onChangePlayback() {
    this.widget.toggle();
  },
  snapshot() {
    return {
      ...this.widget.getState(),
      levels: [...this.widget.getState().levels],
    };
  },
  releaseWidget() {
    this.stopListening(this.widget);
    this.widget?.destroy();
  },
  onBeforeDetach() {
    this.releaseWidget();
  },
  onBeforeDestroy() {
    this.releaseWidget();
  },
});
const RetiredRadio = View.extend({
  className: 'retired-radio',
  template: ({
    levels,
    frames,
    deliveries,
  }) => `<p>RETIRED RADIO — its last frame, frozen. No ghost wiggles.</p>
    <div class="radio-display"><div class="radio-dial">📻 &nbsp; FM 404 · SIGNAL FOUND</div>
    <div class="equalizer">${levels.map(level => `<i style="transform:scaleY(${level})"></i>`).join('')}</div>
    <small class="radio-frames">${frames} animation frames</small><p class="widget">📡 Broadcasts heard: ${deliveries}</p></div>`,
});

export { Radio, RetiredRadio };

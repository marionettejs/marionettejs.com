import { View } from 'marionette';
import { MissionControl, StationLoader, StationControls, MissionChapters } from './readiness.js';

// Two lessons, one Application. This shell coordinates chapter navigation.
// readiness.js gates the root View; flight.js owns each cancellable delivery.
const StationConsole = View.extend({
  className: 'mission-console',
  template: () => `
    <div class="chapters-slot"></div>
    <div class="controls-slot station-controls"></div>
    <div class="station-stage">
      <div class="station-screen"></div>
      <div class="loader-slot"></div>
    </div>
    `,
  ui: {
    screen: '.station-screen',
  },
  regions: {
    chapters: '.chapters-slot',
    loader: '.loader-slot',
    controls: '.controls-slot',
  },
  childViewEvents: {
    'select:readiness': 'onSelectReadiness',
    'select:flight': 'onSelectFlight',
    'click:open': 'onClickOpen',
    'click:close': 'onClickClose',
    'click:failPreparation': 'onClickFailPreparation',
    'click:destroy': 'onClickDestroy',
    'click:reset': 'onClickReset',
    'toggle:exploration': 'onToggleExploration',
  },
  onSelectReadiness() {
    this.showChapter(1);
  },
  onSelectFlight() {
    this.showChapter(2);
  },
  showChapter(chapter) {
    this.chapter = chapter;
    this.el.dataset.chapter = chapter;
    this.triggerMethod('change:chapter', chapter);
    this.showChildView(
      'chapters',
      new MissionChapters({
        model: {
          chapter,
          ready: this.phase === 'open',
        },
      }),
    );
  },
  onToggleExploration(exploring) {
    this.exploring = exploring;
  },
  initialize() {
    this.attempt = 0;
  },
  onBeforeRender() {
    this.releaseApplication();
  },
  onRender() {
    this.application = new MissionControl({
      region: {
        el: this.getUI('screen')[0],
      },
    });
    this.present('closed', 'CLOSED. No flight screen exists yet.');
  },
  async onClickOpen() {
    if (this.phase === 'opening') {
      this.preparationStep = this.getChildView('loader').advance();
      this.showControls();
      return;
    }
    const attempt = ++this.attempt;
    const application = this.application;
    this.present(
      'opening',
      'PREPARING. The flight screen is still absent. Each click opens another 25%.',
    );
    try {
      const started = await application.start({
        loader: this.getChildView('loader'),
      });
      if (application !== this.application || this.isDestroyed()) return;
      this.triggerMethod('settle:start', started);
      if (!started) {
        return;
      }
      if (attempt !== this.attempt || this.isDestroyed()) {
        return;
      }
      this.present(
        'open',
        'OPEN. Preparation completed; the Application attached its flight screen.',
      );
    } catch (error) {
      if (attempt !== this.attempt || this.isDestroyed()) {
        return;
      }
      this.triggerMethod('fail:start', error);
      this.present(
        'failed',
        'FAILED. Antenna in cheese. No flight screen. Repair by opening again.',
      );
    }
  },
  async onClickClose() {
    const attempt = ++this.attempt;
    await this.application.stop();
    if (attempt !== this.attempt || this.isDestroyed()) {
      return;
    }
    this.present(
      'closed',
      'CLOSED. The Application has no flight screen. Open again for a fresh start.',
    );
  },
  onClickFailPreparation() {
    this.getChildView('loader').fail();
  },
  async onClickDestroy() {
    const attempt = ++this.attempt;
    await this.application.destroy();
    if (attempt !== this.attempt || this.isDestroyed()) {
      return;
    }
    this.present(
      'destroyed',
      'DESTROYED. Even mission control has left the building. Reset to build a new Application.',
    );
  },
  onClickReset() {
    this.triggerMethod('reset:station');
  },
  showControls() {
    this.showChildView(
      'controls',
      new StationControls({
        model: {
          phase: this.phase,
          exploring: this.exploring,
          preparationStep: this.preparationStep,
        },
      }),
    );
  },
  present(phase, message) {
    this.phase = phase;
    this.preparationStep = phase === 'opening' ? 1 : phase === 'open' ? 4 : 0;
    this.showChildView(
      'loader',
      new StationLoader({
        model: {
          phase,
          message,
        },
      }),
    );
    this.showControls();
    this.showChapter(1);
    this.triggerMethod('change:phase', phase);
  },
  releaseApplication() {
    this.attempt++;
    this.application?.destroy().catch(error => console.error(error));
  },
  onBeforeDestroy() {
    this.releaseApplication();
  },
});

export { StationConsole };

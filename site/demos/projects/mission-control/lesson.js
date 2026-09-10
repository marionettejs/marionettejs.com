import { LessonController, demoInspector, explain, story } from './lesson-ui.js';
import { RetiredFlight } from './flight.js';

const readiness = symbol => ({ file: 'readiness.js', symbol });
const flight = symbol => ({ file: 'flight.js', symbol });
const shell = symbol => ({ file: 'app.js', symbol });

export const MissionLesson = LessonController.extend({
  observe(view) {
    this.phase = this.retired = this.current = this.root = this.applicationRegion = null;
    this.listenTo(view, 'change:phase', this.onChangePhase);
    this.listenTo(view, 'change:chapter', this.onChangeChapter);
    this.listenTo(view, 'settle:start', this.onSettleStart);
    this.listenTo(view, 'fail:start', this.onFailStart);
    this.listenTo(view, 'reset:station', this.reset);
  },
  onSettleStart(started) {
    if (started === false) {
      demoInspector.check('cancelled-start-false', true);
    }
  },
  onFailStart(error) {
    demoInspector.check(
      'current-failure-rejects',
      error.message === 'The antenna fell into the cheese' && !this.view.application.isRunning(),
    );
  },
  ready() {
    this.onChangeChapter(1);
  },
  onChangeChapter(chapter) {
    if (chapter === 1) {
      explain(
        'Lesson 1 · Readiness gates the app screen.',
        readiness('MissionControl.onBeforeStart'),
        'Open the hangar in four deliberate steps. The pending Promise prevents the app from showing its root View. Cancel or fail an opening to compare those outcomes.',
      );
    } else {
      explain(
        'Lesson 2 · A View owns unfinished work.',
        flight('Mission.onBeforeDestroy'),
        'Start the guided flight. It pauses halfway so you can read before cancelling. The beam game uses this same cleanup hook.',
        ['Launch a ship View.', 'Read the pending state.', 'Remove the View and follow cleanup.'],
      );
      story('The ship gets a job—and a very clear cancellation policy.');
    }
  },
  onChangePhase(phase) {
    const view = this.view;
    const app = view.application;
    if (this.application !== app) {
      if (this.root) this.stopListening(this.root);
      this.phase = this.root = this.current = this.retired = null;
      this.application = app;
      this.applicationRegion = app.getRegion();
    }
    const region = this.applicationRegion;
    const previous = this.phase;
    this.phase = phase;
    demoInspector.observeRegion('application.root', region);
    if (phase === 'opening') {
      this.writes = app.getState().readinessWrites;
      explain(
        'Readiness is pending. No root View exists.',
        readiness('MissionControl.onBeforeStart'),
        'Each click opens another 25%. Between clicks, start() stays pending. The fourth click completes preparation.',
      );
    }
    if (phase === 'open') {
      this.root = app.getView();
      demoInspector.observeView('flight-screen', this.root);
      demoInspector.observeRegion('mission.slot', this.root.getRegion('worker'));
      this.listenTo(this.root, 'retire:flight', this.onRetireFlight);
      this.listenTo(this.root, 'launch:flight', this.onLaunchFlight);
      this.listenTo(this.root, 'pause:flight', this.onPauseFlight);
      this.listenTo(this.root, 'settle:flight', this.onSettleFlight);
      this.listenTo(this.root, 'cancel:flight', this.onCancelFlight);
      this.listenTo(this.root, 'hit:flight', this.onHitFlight);
      this.listenTo(this.root, 'miss:flight', this.onMissFlight);
      demoInspector.check('fresh-start-true', app.isRunning());
      demoInspector.check('root-shown', this.root.isAttached());
      explain(
        'Readiness succeeded. The root View is attached.',
        readiness('MissionControl.onStart'),
        'Preparation resolved before Application invoked onStart. Choose Lesson 2 above to work with the ship.',
        ['Preparation finished.', 'Application invoked onStart.', 'The root View was attached.'],
      );
      story('Hangar open: 100%. No need to hurry. The next lesson waits for you.');
    }
    if (phase === 'failed') {
      explain(
        'Failure rejects start. It creates no app screen.',
        shell('StationConsole.onClickOpen'),
        'An error is different from cancellation, which returns false. Open again to retry the same Application.',
      );
    }
    if (phase === 'closed' || phase === 'destroyed') {
      if (previous === 'opening') {
        demoInspector.check('readiness-aborted', app.getState().signal.aborted);
        demoInspector.check('no-stale-write', app.getState().readinessWrites === this.writes);
      }
      if (this.root) {
        demoInspector.check('stopped-root-destroyed', this.root.isDestroyed() && !region.hasView());
      }
      if (this.current?.getState().status === 'flying') {
        demoInspector.check(
          'close-cancels-flight',
          this.current.isDestroyed() &&
            this.current.getState().controller.signal.aborted &&
            this.current.getState().commits === 0,
        );
      }
      if (previous) {
        explain(
          'Closing the app ends its children’s work.',
          shell('StationConsole.onClickClose'),
          'Stopping Application destroys its root View, which destroys its child Regions and ship. Cancelling one ship leaves the app running.',
        );
      }
      if (phase === 'destroyed') {
        demoInspector.check('application-destroyed', app.isDestroyed() && !region.hasView());
        explain(
          'The Application’s lifetime has ended.',
          shell('StationConsole.onClickDestroy'),
          'Stop permits another opening. Destroy ends the instance; Reset creates another.',
        );
      }
    }
    demoInspector.updateObjects('application', [
      [
        'Application',
        phase.toUpperCase(),
        app.getState().readinessWrites + ' readiness completions',
      ],
      [
        'Root View',
        region.hasView() ? 'ATTACHED' : 'ABSENT',
        app.getState().starts + ' successful starts',
      ],
    ]);
  },
  onRetireFlight(old) {
    this.retired = old;
    demoInspector.showRetired(new RetiredFlight({ model: old.snapshot() }));
  },
  verifyRetirement() {
    if (!this.retired) {
      return;
    }
    const state = this.retired.getState();
    demoInspector.check('old-work-aborted', state.controller.signal.aborted);
    demoInspector.check('old-view-destroyed', this.retired.isDestroyed());
    if (state.status === 'flying') {
      demoInspector.check('no-stale-commit', state.commits === 0);
    }
  },
  onLaunchFlight(mission) {
    this.verifyRetirement();
    this.current = mission;
    demoInspector.observeView('mission-' + mission.cid, mission);
    explain(
      'A new View owns one unfinished delivery.',
      flight('Mission.fly.completion'),
      'This excerpt shows the actual await, cancellation guard, and delivery write in Mission.fly. The guided flight pauses halfway; the game keeps moving.',
    );
    story(
      'The cheese is in transit. It does not count as delivered just because we feel optimistic.',
    );
  },
  onPauseFlight() {
    explain(
      'Paused is not finished. Nothing has been delivered.',
      flight('Mission.fly.completion'),
      'The animation is paused at the await. The following guard and delivery write have not run. Cancel this flight when you have finished reading.',
      [
        'The ship reached its reading stop.',
        'The View and Promise remain alive.',
        'Choose Cancel this flight.',
      ],
    );
  },
  onHitFlight() {
    demoInspector.check(
      'beam-hit-aborts',
      this.retired.isDestroyed() && this.retired.getState().controller.signal.aborted,
    );
  },
  onMissFlight() {
    demoInspector.check(
      'beam-miss-continues',
      !this.current.isDestroyed() && !this.current.getState().controller.signal.aborted,
    );
    explain(
      'A miss leaves the same View alive.',
      flight('FlightDeck.onClickFireBeam'),
      'No Region was emptied. The same ship and unfinished job continue.',
    );
  },
  onCancelFlight() {
    this.verifyRetirement();
    demoInspector.check(
      'station-survives-cancel',
      this.view.application.isRunning() && !this.root.isDestroyed(),
    );
    explain(
      'The View left. Our hook aborted its work.',
      [flight('FlightDeck.cancelFlight'), flight('Mission.onBeforeDestroy')],
      'Marionette invokes the View lifecycle. Our AbortController cancels the animation so it cannot record a delivery.',
      [
        'You cancelled the ship’s delivery.',
        'The Region removed its View.',
        'Marionette called onBeforeDestroy.',
        'Our hook aborted the flight.',
        'No cheese was delivered.',
      ],
    );
    story(
      'Zero cheese delivered. The station remains open for the next questionable space errand.',
    );
  },
  onSettleFlight(mission) {
    const state = mission.getState();
    if (state.status === 'landed') {
      demoInspector.check('replacement-completed', state.commits === 1);
    }
    this.verifyRetirement();
    explain(
      state.status === 'landed'
        ? 'The finished flight records one delivery.'
        : 'The failed flight records no delivery.',
      flight('Mission.fly.completion'),
      'Read the await, the cancellation guard, and the successful write in the actual method. A failed or cancelled operation cannot take the success path.',
    );
  },
});

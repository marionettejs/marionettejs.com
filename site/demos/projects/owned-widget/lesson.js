import { LessonController, demoInspector, lesson, explain, story } from './lesson-ui.js';
import { RetiredRadio } from './radio-view.js';

export const RadioLesson = LessonController.extend({
  observe(view) {
    this.listenTo(view, 'render', () => demoInspector.observeView('first-widget', view.current));
    this.listenTo(view, 'replace:radio', this.onReplaceRadio);
    this.listenTo(view, 'send:broadcast', this.onSendBroadcast);
    this.listenTo(view, 'before:destroy', () => this.snapshot(view.current));
    this.listenTo(this.region, 'empty', () => {
      demoInspector.check(
        'parent-cleanup',
        view.isDestroyed() &&
          view.current.isDestroyed() &&
          view.current.widget.getState().disposals === 1 &&
          !this.region.hasView(),
      );
      explain(
        'Station closed. Its final child was released.',
        { file: 'app.js', symbol: 'RadioStation.onClickCloseStation' },
        'Destroying the owner destroys its Regions and child Views. Their cleanup hooks release external work. Reset the demo to reopen it.',
      );
      story('Silence. Finally, a station that knows when to stop.');
    });
  },
  ready() {
    this.lastDeliveries = this.view.current.widget.getState().deliveries;
    explain(
      'A View owns an external widget.',
      { file: 'radio-view.js', symbol: 'Radio.onAttach' },
      'Attach starts the widget; detach releases it. Reattaching creates a fresh widget with the tuner’s saved settings. Swap the radio, then broadcast again to challenge cleanup.',
    );
  },
  snapshot(view) {
    lesson.showChildView('retired', new RetiredRadio({ model: view.snapshot() }));
  },
  onReplaceRadio(old, current) {
    this.lastDeliveries = current.widget.getState().deliveries;
    this.retired = old;
    this.retiredDeliveries = old.widget.getState().deliveries;
    demoInspector.observeView('replacement-widget', current);
    this.snapshot(old);
    demoInspector.check('old-view-destroyed', old.isDestroyed());
    demoInspector.check(
      'widget-disposed-once',
      old.widget.getState().disposals === 1 && !old.widget.getState().playing,
    );
    explain(
      'The Region replaced its child. Our hook unplugged it.',
      [
        { file: 'app.js', symbol: 'RadioStation.onClickReplaceRadio' },
        { file: 'radio-view.js', symbol: 'Radio.releaseWidget' },
      ],
      'The frozen radio is a portrait. Broadcast again to check the actual retired widget—freezing a picture alone proves nothing.',
      [
        'The Region replaced its child.',
        'Marionette invoked View cleanup.',
        'Our code destroyed the widget.',
      ],
    );
    story('A still picture is not proof of cleanup. Can the old receiver still hear us?');
  },
  onSendBroadcast() {
    const current = this.view.current;
    const live = current.widget.getState().deliveries;
    if (!this.retired) {
      story('The live radio heard broadcast ' + live + '. Swap it, then broadcast again.');
      return;
    }
    const retired = this.retired.widget.getState().deliveries;
    this.snapshot(this.retired);
    demoInspector.check('old-widget-unsubscribed', retired === this.retiredDeliveries);
    demoInspector.check(
      'replacement-live',
      !current.isDestroyed() && live === this.lastDeliveries + 1,
    );
    this.lastDeliveries = live;
    explain(
      'A new broadcast cannot reach the retired receiver.',
      { file: 'motion.js', symbol: 'RadioWidget.onBeforeDestroy' },
      'Marionette calls our cleanup hook; the widget removes its external listener. An abandoned chart or editor needs the same handoff to stop receiving updates.',
      [
        'You sent another broadcast.',
        'The current receiver heard it.',
        'The retired object’s counter did not increase.',
      ],
    );
    story(
      'Broadcast sent. Live receiver: ' +
        live +
        '. Retired receiver: ' +
        retired +
        '. The old object was checked again; it heard nothing new.',
    );
    demoInspector.updateObjects('radio', [
      ['Retired receiver', 'DESTROYED', retired + ' broadcasts'],
      ['Live receiver', 'LISTENING', live + ' broadcasts'],
    ]);
  },
});

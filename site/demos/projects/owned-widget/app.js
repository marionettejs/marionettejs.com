import { View } from 'marionette';
import { Radio } from './radio-view.js';

// The station replaces its radio through a Region, then challenges cleanup.
// radio-view.js owns the widget; motion.js implements the integration.
const RadioStation = View.extend({
  template: () => `
    <div class="slot"></div>
    <div class="controls"><button id="replace-widget">1. Swap radio</button>
    <button id="broadcast-radio">2. Broadcast again 📡</button>
    <button id="destroy-owner">Close the station</button></div>
  `,
  regions: {
    widget: '.slot',
  },
  ui: {
    replace: '#replace-widget',
    broadcast: '#broadcast-radio',
    close: '#destroy-owner',
  },
  triggers: {
    'click @ui.replace': 'click:replaceRadio',
    'click @ui.broadcast': 'click:broadcast',
    'click @ui.close': 'click:closeStation',
  },
  onRender() {
    this.current = new Radio();
    this.showChildView('widget', this.current);
  },
  onClickReplaceRadio() {
    const old = this.current;
    this.current = new Radio();
    this.showChildView('widget', this.current);
    this.triggerMethod('replace:radio', old, this.current);
  },
  onClickBroadcast() {
    document.dispatchEvent(new Event('broadcast:radio'));
    this.triggerMethod('send:broadcast');
  },
  onClickCloseStation() {
    this.destroy();
  },
});

export { RadioStation };

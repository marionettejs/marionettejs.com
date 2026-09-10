import { MnObject } from 'marionette';

// MnObject owns the imperative animation integration. The View owns this
// object and destroys it explicitly. View updates use templates and events.
const RadioWidget = MnObject.extend({
  createState() {
    return {
      deliveries: 0,
      disposals: 0,
      frames: 0,
      frequency: 4,
      playing: true,
      levels: Array(9).fill(1),
    };
  },
  initialize({ bars, frequency, playing }) {
    this.bars = bars;
    Object.assign(this.getState(), { frequency, playing });
    this.receive = () => {
      this.getState().deliveries++;
      this.triggerMethod('receive:broadcast');
    };
    document.addEventListener('broadcast:radio', this.receive);
  },
  start() {
    if (!this.getState().playing) {
      return;
    }
    const paint = time => {
      const state = this.getState();
      if (!state.playing || this.isDestroyed()) {
        return;
      }
      state.frames++;
      state.levels = state.levels.map(
        (_, index) =>
          0.15 + Math.abs(Math.sin(time / (600 / state.frequency) + index * 0.7)) * 0.85,
      );
      // The only direct rendering is the external animation boundary.
      this.bars.forEach((bar, index) => {
        bar.style.transform = 'scaleY(' + state.levels[index] + ')';
      });
      if (state.frames % 6 === 0) {
        this.triggerMethod('render:frame');
      }
      this.frame = requestAnimationFrame(paint);
    };
    this.frame = requestAnimationFrame(paint);
  },
  tune(frequency) {
    this.getState().frequency = frequency;
  },
  toggle() {
    const state = this.getState();
    state.playing = !state.playing;
    if (state.playing) {
      this.start();
    } else {
      cancelAnimationFrame(this.frame);
    }
  },
  onBeforeDestroy() {
    this.getState().disposals++;
    this.getState().playing = false;
    cancelAnimationFrame(this.frame);
    document.removeEventListener('broadcast:radio', this.receive);
  },
});

export { RadioWidget };

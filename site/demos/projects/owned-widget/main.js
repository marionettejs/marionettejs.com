import { RadioStation } from './app.js';
import { RadioLesson } from './lesson.js';
export { inspectRecipe } from './lesson-ui.js';

const controller = new RadioLesson({
  ViewClass: RadioStation,
  configuration: {
    icon: '📻',
    title: 'Radio Ghostbusters',
    question: 'When a View leaves, who switches off its widget?',
    introduction:
      'Charts, maps, and editors can keep working after their elements leave the page. This radio has the same problem to solve: who stops its animation and subscription?',
    instruction:
      'First swap the radio, then broadcast again. The live receiver should count the message; the retired receiver must not.',
    evidence: [
      {
        id: 'old-view-destroyed',
        label: 'The retired radio View was destroyed.',
      },
      {
        id: 'widget-disposed-once',
        label: 'Its widget was unplugged exactly once.',
      },
      {
        id: 'old-widget-unsubscribed',
        label: 'The old radio received no test broadcast.',
      },
      {
        id: 'replacement-live',
        label: 'The new radio received the broadcast.',
      },
      {
        id: 'parent-cleanup',
        label: 'Closing the station destroyed its owner and final radio.',
      },
    ],
  },
});

export const region = controller.region;

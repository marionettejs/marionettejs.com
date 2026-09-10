import { StationConsole } from './app.js';
import { MissionLesson } from './lesson.js';
export { inspectRecipe } from './lesson-ui.js';

const controller = new MissionLesson({
  ViewClass: StationConsole,
  configuration: {
    icon: '🚀',
    title: 'Cheese Patrol',
    introduction: 'Prepare the app. Then launch a ship whose View owns the delivery.',
    evidence: [
      {
        id: 'beam-miss-continues',
        label: 'A missed beam left the flight alive.',
      },
      {
        id: 'beam-hit-aborts',
        label: 'A beam hit destroyed the ship View and aborted its flight.',
      },
      {
        id: 'cancelled-start-false',
        label: 'Cancelling preparation returned false from Application.start().',
      },
      {
        id: 'readiness-aborted',
        label: 'The pending readiness signal was aborted.',
      },
      {
        id: 'no-stale-write',
        label: 'Cancelled readiness made no successful write.',
      },
      {
        id: 'fresh-start-true',
        label: 'A complete preparation returned true.',
      },
      {
        id: 'root-shown',
        label: 'Readiness succeeded before the flight screen attached.',
      },
      {
        id: 'current-failure-rejects',
        label: 'Broken preparation rejected start as an error.',
      },
      {
        id: 'old-work-aborted',
        label: 'The retired rocket’s AbortController was aborted.',
      },
      {
        id: 'old-view-destroyed',
        label: 'The retired rocket View was destroyed.',
      },
      {
        id: 'no-stale-commit',
        label: 'A cancelled rocket made zero deliveries.',
      },
      {
        id: 'replacement-completed',
        label: 'A successful rocket delivered exactly once.',
      },
      {
        id: 'station-survives-cancel',
        label: 'Cancelling a rocket left the Application and flight screen alive.',
      },
      {
        id: 'stopped-root-destroyed',
        label: 'Closing the Application destroyed its flight screen.',
      },
      {
        id: 'close-cancels-flight',
        label: 'Closing during flight destroyed the rocket and cancelled delivery.',
      },
      {
        id: 'application-destroyed',
        label: 'Destroy ended the Application and emptied its Region.',
      },
    ],
  },
});

export const region = controller.region;

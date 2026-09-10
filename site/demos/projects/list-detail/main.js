import { Todos } from './app.js';
import { TodoLesson } from './lesson.js';
import { TodoCollection } from './todo-views.js';
export { inspectRecipe } from './lesson-ui.js';

const controller = new TodoLesson({
  ViewClass: Todos,
  viewOptions: { collection: new TodoCollection([{ title: 'Finish one small thing' }]) },
  configuration: {
    icon: '☑',
    title: 'TodoMVC, one View at a time',
    question: 'How does a Model become a row you can interact with?',
    introduction:
      'Add a task, complete it, then remove it. Follow the data, child events, and Views that make a small app work. Your world domination plans can wait in the optional scratchpad.',
    instruction:
      'First: add a todo above. Then complete or delete it and follow the code beside the app. This demo keeps data only for this run.',
    evidence: [
      {
        id: 'child-identity',
        label: 'The original todo is the same View and DOM element.',
      },
      {
        id: 'input-identity',
        label: 'Your editor is the same input, not a convincing replacement.',
      },
      {
        id: 'draft-preserved',
        label: 'Every typed character survived the list change.',
      },
      {
        id: 'focus-preserved',
        label: 'The keyboard focus stayed in your draft.',
      },
      {
        id: 'removed-child-destroyed',
        label: 'The removed todo View was destroyed. One less thing.',
      },
    ],
  },
});

export const region = controller.region;

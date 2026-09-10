import { projects } from './demo-projects.js';
import todoCSS from './todomvc-style.js';

export const recipeRuntime = Object.freeze({
  "package": "marionette",
  "version": "5.0.0-beta.2",
  "revision": "13f4954c352e646c413091ffdd83f6da59404573",
  "data": { "package": "@mnjs/data", "version": "5.0.0-beta.2" }
});

const css = `
body { background:#f6f0e3; color:#292c35; }
#app { padding:28px; max-width:1120px; margin:auto; }
h1 { font:italic 34px/1.12 Georgia,serif; letter-spacing:-1.5px; margin:14px 0; }
h2 { font-size:19px; margin:0 0 12px; }
p { line-height:1.65; }
.kicker { font:11px/1.5 monospace; letter-spacing:2px; color:#90533e; }
.hero { display:flex; gap:20px; align-items:center; }
.mascot { font-size:44px; background:#edddc3; border-radius:38% 62% 52% 48%; width:78px; height:78px; display:grid; place-items:center; flex-shrink:0; transform:rotate(-8deg); }
.lede { color:#595660; font-size:14px; }
#experiment { margin:22px 0; }
button { border:0; border-radius:24px; padding:12px 18px; margin:4px 6px 4px 0; cursor:pointer; background:#303c58; color:#fff; font-weight:600; }
button:hover { background:#475b80; }
button:disabled { opacity:.55; cursor:default; }
label { display:block; font-size:14px; font-weight:600; }
input { display:block; width:100%; margin:10px 0; padding:14px; border:2px solid #c2aa88; border-radius:7px; background:#fffdf7; color:#292c35; }
input:focus { border-color:#366e69; }
.list ul { display:flex; gap:10px; flex-wrap:wrap; padding:0; list-style:none; }
.list li { background:#e6dbc6; border:1px solid #cbb799; padding:12px; border-radius:10px; }
.detail,.slot,.feature { padding:20px; margin-top:15px; border:2px dashed #c5b699; border-radius:12px; }
.slot:empty::before,.feature:empty::before { content:'No View in this Region.'; font-size:14px; color:#77705f; }
.scene { display:flex; align-items:center; gap:18px; }
.scene>span { font-size:54px; }
.result,.widget { font-weight:600; }
.proof { border-top:1px solid #cbbda5; padding-top:20px; }
.proof h2 { font:italic 25px Georgia,serif; }
.proof ol { list-style:none; padding:0; }
.proof li { padding:9px 12px; margin:6px 0; border-radius:7px; font-size:13px; background:#e9e4d8; color:#696355; }
.proof li[data-result=pass] { background:#dcece1; color:#20543e; }
.proof li[data-result=fail] { background:#f6d9d5; color:#8a2828; }
.story { padding:12px 16px; border-left:3px solid #c8704d; background:#efe2cd; font-size:14px; }
.fine { font-size:12px; color:#706654; }
pre { white-space:pre-wrap; overflow-wrap:anywhere; font-size:12px; }
@media(max-width:440px) { #app { padding:20px; } h1 { font-size:34px; } .mascot { width:70px;height:70px;font-size:44px; } .hero { gap:12px; } }

[hidden] { display:none !important; }
.sr-only { position:absolute; width:1px; height:1px; overflow:hidden; clip-path:inset(50%); }
.todoapp { background:#fffdf8; padding:18px; border-radius:10px; box-shadow:0 5px 0 #e0d6c2,0 10px 0 #ede3d0; }
.todos-heading { text-align:center; font:300 64px/1 Georgia,serif; color:#a8604e; margin:0 0 20px; }
.list ul { display:block; margin:12px 0; }
.list .todo-item { display:flex; align-items:center; gap:10px; padding:12px 0; border:0; border-bottom:1px solid #e8dfd0; border-radius:0; background:transparent; }
.todo-item input.toggle { width:22px; height:22px; margin:0; flex-shrink:0; accent-color:#4d8074; }
.todo-title { flex:1; overflow-wrap:anywhere; }
.completed .todo-title { text-decoration:line-through; color:#827c70; }
.todo-item button { font-size:12px; padding:7px 10px; margin:0; background:#eee7da; color:#554e44; }
.todo-item.editing>*:not(.edit) { display:none; }
.todo-footer { font-size:12px; display:flex; align-items:center; flex-wrap:wrap; gap:8px; }
.todo-footer button { font-size:12px; background:transparent; color:#514d46; padding:6px 8px; border:1px solid transparent; margin:0; }
.todo-footer button[aria-pressed=true] { border-color:#b9846f; }
.todo-footer #todo-count { margin-right:auto; }
`;

const lessonCSS = `
.source-excerpt { margin:20px 0; min-width:0; }
.lesson-step .source-link { display:block; padding:0; margin:0 0 10px; border:0; background:none; color:#f0bd76; text-align:left; font:600 13px/1.6 monospace; overflow-wrap:anywhere; }
.lesson-step .source-caption { display:block; font:10px/1.5 monospace; letter-spacing:.5px; color:#acb9c7; margin:0 0 8px; }
.source-lines { background:#111d2d; border:1px solid #657184; border-radius:6px; overflow:hidden; }
.lesson-step .source-lines pre { margin:0; border:0; padding:12px; font:12px/1.75 monospace; white-space:pre-wrap; overflow-wrap:anywhere; background:transparent; }
.syntax-keyword { color:#e9b3f5; } .syntax-string { color:#dbcb8d; } .syntax-number { color:#f7ab85; } .syntax-comment { color:#95a4b6; } .syntax-name { color:#bde8d4; } .syntax-punctuation { color:#c3cbd8; }

.mission-chapters { display:flex; flex-wrap:wrap; gap:8px; margin-bottom:8px; }
#experiment .mission-chapters button { margin:6px 0; }
.mission-chapters button { flex:1; min-width:180px; border:2px solid transparent; }
.mission-chapters button[aria-pressed=true] { border-color:#303c58; background:#f0bd76; color:#202c3d; }
.mission-console[data-chapter="1"] .station-screen { display:none; }
.mission-console[data-chapter="1"] .station-stage { min-height:340px; }
.mission-console[data-chapter="1"] .station-stage > .loader-slot { visibility:visible; pointer-events:auto; }
.mission-console[data-chapter="1"] .station-loader[data-phase="open"] { padding:24px; margin:0; }
.mission-console[data-chapter="1"] .station-loader[data-phase="open"] .hangar { display:block; }
.mission-console[data-chapter="1"] .station-loader[data-phase="open"] .hangar-door { display:none; }
.mission-console[data-chapter="2"] .station-controls { display:none; }
.flight-game-label { flex-basis:100%; margin:8px 0 0; }

.lesson-step { padding:22px; margin:0; background:#202c3d; color:#f8f1e3; border-radius:10px; }
.lesson-step small { color:#eebc85; font:11px monospace; letter-spacing:1.5px; }
.lesson-step h2 { font:600 20px/1.3 system-ui,sans-serif; margin:12px 0; }
.lesson-step pre { padding:16px; border:1px solid #657184; background:#111d2d; color:#bde8d4; font:13px/1.7 monospace; }
.lesson-step p { margin:12px 0 0; color:#e3ded6; font-size:14px; }
.lesson-question { margin:24px 0 8px; font-size:24px; max-width:820px; }
.lesson-layout { display:grid; grid-template-columns:minmax(0,1.4fr) minmax(0,1fr); align-items:start; gap:28px; margin:28px 0; }
.lesson-play,.lesson-explanation { min-width:0; }
.lesson-explanation { position:sticky; top:20px; }
#experiment { margin:0; }
.cause-chain { list-style:none; counter-reset:causes; padding:0; margin:20px 0; }
.cause-chain:empty { display:none; }
.cause-chain li { counter-increment:causes; position:relative; padding:0 0 16px 36px; font-size:14px; line-height:1.5; }
.cause-chain li::before { content:counter(causes); position:absolute; left:0; width:24px; height:24px; display:grid; place-items:center; background:#f0bd76; color:#202c3d; border-radius:50%; font-weight:700; }
.cause-chain li:not(:last-child)::after { content:''; position:absolute; top:26px; bottom:3px; left:11px; border-left:1px solid #748496; }
.proof>summary { cursor:pointer; font:500 16px system-ui; padding:4px 0; }
.station-more,.flight-more { flex-basis:100%; font-size:13px; }
.station-more summary,.flight-more summary { cursor:pointer; padding:8px 0; color:#54616f; }
.station-more .fine { max-width:420px; }
@media(max-width:800px) { .lesson-layout { grid-template-columns:1fr; gap:20px; } .lesson-explanation { position:static; } }
.object-board { display:grid; grid-template-columns:1fr 1fr; gap:12px; margin:20px 0; }
.object-board section { border:2px solid #bda980; border-radius:12px; padding:18px; background:#fffdf7; }
.object-board h3 { font-size:18px; margin:0 0 16px; }
.object-board strong { display:block; font:700 17px/1.5 monospace; color:#386859; }
.object-board p { font:13px/1.6 monospace; margin:12px 0 0; }
@media(max-width:440px) { .object-board { grid-template-columns:1fr; } .lesson-step { padding:16px; } }
`;

const motionCSS = `
.controls { display:flex; flex-wrap:wrap; gap:4px 10px; margin:18px 0; }
.flight-path { position:relative; height:240px; background:radial-gradient(circle at 40% 15%,#465784,#142138); border-radius:14px; overflow:hidden; }
.planet { position:absolute; bottom:14px; font-size:40px; }
.earth { left:3%; } .moon { right:3%; }
.rocket { position:absolute; left:10%; top:70px; font-size:36px; line-height:1; }
.flight-slot { min-height:240px; }
.flight-arena { position:relative; }
#experiment .flight-arena .slot { padding:0; border:0; margin:0; background:transparent; }
#experiment .flight-arena .slot:empty { min-height:240px; border-radius:14px; background:radial-gradient(circle at 40% 15%,#465784,#142138); display:grid; place-items:center; }
#experiment .flight-arena .slot:empty::before { content:'Intercepted. Zero cheese delivered.'; color:#d5e9df; font:600 15px system-ui; }
.beam-slot { position:absolute; top:0; left:0; right:0; height:240px; pointer-events:none; }
.beam,.beam-zone { position:absolute; left:42%; width:16%; top:0; bottom:40px; }
.beam-zone { border-left:1px dashed #ffd97999; border-right:1px dashed #ffd97999; background:#ffd97912; }
.beam { background:linear-gradient(90deg,#8affd700,#bcffe8cc,#ffffff,#bcffe8cc,#8affd700); box-shadow:0 0 30px #7affd4; }
.beam-cannon { position:absolute; bottom:10px; left:calc(50% - 18px); font-size:36px; }
.beam-label { position:absolute; bottom:4px; width:100%; text-align:center; color:#ffd979; font:10px monospace; }
.beam-feedback { padding:12px 16px; border-left:3px solid #3f7261; background:#dce9df; line-height:1.6; }
.retired-flight,.retired-radio { border:1px solid #bcae98; border-radius:12px; padding:16px; margin:24px 0; background:#e8e1d3; }
.retired-flight .flight-path { opacity:.6; }
.retired-flight small,.retired-radio>p { font:12px/1.6 monospace; display:block; margin:0 0 12px; }
.radio-display { padding:22px; border:7px solid #705a47; border-radius:20px; background:#152e31; color:#bce8b7; box-shadow:0 6px 0 #443d34; }
.radio-dial { font:13px/1.5 monospace; letter-spacing:1px; }
.equalizer { height:100px; display:flex; align-items:stretch; gap:8px; padding:15px 0; }
.equalizer i { flex:1; background:linear-gradient(#efc577,#6fbfa2); transform-origin:center; border-radius:3px; }
.radio-frames { font:12px monospace; } .radio-display .widget { font:13px monospace; margin:14px 0 0; }
.tuning { margin-top:24px; } .tuning input { padding:0; accent-color:#3f7261; }
.retired-radio .radio-display { filter:saturate(.2); opacity:.75; }
.mission-console .flight-arena { min-height:320px; }
.mission-console .flight-arena .result { min-height:64px; margin:12px 0 0; }
.mission-console .feedback-slot { min-height:100px; }
.mission-console .station-stage { display:grid; min-height:760px; align-items:start; }
.mission-console .station-screen,.mission-console .loader-slot { grid-area:1 / 1; min-width:0; }
.mission-console .loader-slot:has([data-phase="open"]) { visibility:hidden; pointer-events:none; }
.mission-console .station-controls { position:relative; margin-bottom:10px; }
.mission-console .station-controls> .controls { margin:0; }
#experiment .station-more { flex-basis:auto; margin:0; padding:0; border:0; align-self:center; }
#experiment .station-more[open] { flex-basis:100%; }
.mission-console #reset-station { position:absolute; left:0; top:12px; margin:0; }
.mission-console #open-station { min-width:220px; }
.mission-console .station-controls:has(#reset-station:not([hidden])) #open-station { visibility:hidden; }


@media(max-width:800px) { .mission-console .station-stage { min-height:900px; }  }
.station-loader { padding:24px; border:2px solid #748a9b; border-radius:14px; background:#e6edf0; }
.station-loader h2,.flight-deck h2 { margin:0 0 16px; }
.hangar { position:relative; height:180px; overflow:hidden; border-radius:10px; background:radial-gradient(ellipse,#354562,#111827); }
.hangar-ship { position:absolute; font-size:70px; left:calc(50% - 35px); top:45px; transform:rotate(45deg); }
.hangar-door { position:absolute; width:50%; height:100%; left:0; background:repeating-linear-gradient(0deg,#576579 0 20px,#485467 20px 23px); border-right:3px solid #f1c35a; }
.hangar-door:nth-of-type(2) { left:50%; border-left:3px solid #f1c35a; border-right:0; }
.hangar-sign { position:absolute; bottom:12px; left:0; right:0; text-align:center; color:#ffe6a1; font:12px monospace; }
.station-loader[data-phase="open"] .hangar,.station-loader[data-phase="open"] .fine { display:none; }
.station-loader[data-phase="open"] { padding:10px 18px; margin-top:24px; }
.station-loader[data-phase="failed"] { border-color:#a64c38; background:#f2dfd4; }
.station-status { font-weight:700; }
.flight-deck { margin-bottom:24px; }
@media(max-width:440px) { .radio-display { padding:14px; } .equalizer { gap:5px; } .station-loader { padding:16px; } }

`;

const spacingCSS = `
#experiment button { margin-top:12px; margin-bottom:12px; }
#experiment .slot, #experiment .feature { margin-bottom:16px; }
#experiment details { margin-top:20px; padding:16px 0 4px; border-top:1px solid #d2c6b0; }
#experiment summary { cursor:pointer; line-height:1.6; padding:4px 0; }
#experiment details pre { margin-top:16px; }
`;

export const recipes = [
{
  "id": "list-detail",
  "title": "TodoMVC, one View at a time",
  "summary": "@mnjs/data Models and Collection drive TodoMVC. CollectionView observes membership; modelEvents render changed rows and collectionEvents update counts. A separate notes Region preserves draft, focus and identity.",
  "docs": [
    "/docs/collection-view/",
    "/docs/view/",
    "/docs/lifecycle/"
  ],
  "checks": [
    {
      "id": "child-identity",
      "expected": true
    },
    {
      "id": "input-identity",
      "expected": true
    },
    {
      "id": "draft-preserved",
      "expected": true
    },
    {
      "id": "focus-preserved",
      "expected": true
    },
    {
      "id": "removed-child-destroyed",
      "expected": true
    }
  ],
  css: css + lessonCSS + spacingCSS + todoCSS,
  readingGuide: [
    { label: '1. Data becomes a row', file: 'todo-views.js', symbol: 'TodoList.childView', detail: 'TodoList → childView: TodoItem. CollectionView observes Collection membership.' },
    { label: '2. A row changes its Model', file: 'todo-views.js', symbol: 'TodoItem.onChangeCompleted', detail: 'TodoItem.onChangeCompleted → model.set. Its modelEvents render the changed row.' },
    { label: '3. Child events reach the owner', file: 'todo-views.js', symbol: 'TodoList.onClickRemove', detail: 'TodoList.onClickRemove handles click:remove from a child, then removes its Model.' },
    { label: '4. Independent Regions', file: 'app.js', symbol: 'Todos.refresh', detail: 'Todos.refresh changes the list filter without rerendering the notes View.' },
  ],
  sourceFiles: projects['list-detail']
},
{
  "id": "owned-widget",
  "title": "Radio Ghostbusters",
  "summary": "A View explicitly releases an application-owned widget subscription in onBeforeDestroy. Region replacement destroys its previous View; parent teardown destroys the replacement.",
  "docs": [
    "/docs/lifecycle/",
    "/docs/region/"
  ],
  "checks": [
    {
      "id": "old-view-destroyed",
      "expected": true
    },
    {
      "id": "widget-disposed-once",
      "expected": true
    },
    {
      "id": "old-widget-unsubscribed",
      "expected": true
    },
    {
      "id": "replacement-live",
      "expected": true
    },
    {
      "id": "parent-cleanup",
      "expected": true
    }
  ],
  css: css + lessonCSS + spacingCSS + motionCSS,
  readingGuide: [
    { label: '1. Attach the integration', file: 'radio-view.js', symbol: 'Radio.onAttach', detail: 'Radio.onAttach creates the widget. Read releaseWidget and the detach/destroy hooks in this same View.' },
    { label: '2. Replace the child', file: 'app.js', symbol: 'RadioStation.onClickReplaceRadio', detail: 'RadioStation.onClickReplaceRadio replaces a Region child. Marionette invokes cleanup on the old View.' },
    { label: '3. Challenge the retired receiver', file: 'app.js', symbol: 'RadioStation.onClickBroadcast', detail: 'RadioStation.onClickBroadcast sends an external broadcast. RadioLesson checks that only the live widget received it.' },
  ],
  sourceFiles: projects['owned-widget']
},
{
  "id": "mission-control",
  "title": "Cheese Patrol",
  "summary": "Application readiness prepares the station before attaching a flight screen. Each rocket View owns a three-second delivery. Fire a beam at 40–60% progress to cancel it; misses leave the flight alive. Cancel preparation, fail it, retry, cancel or replace a flight, or stop the Application to destroy the entire screen and its work.",
  "docs": [
    "/docs/application/",
    "/docs/region/",
    "/docs/lifecycle/"
  ],
  "checks": [
    { "id": "beam-miss-continues", "expected": true },
    { "id": "beam-hit-aborts", "expected": true },
    {
      "id": "cancelled-start-false",
      "expected": true
    },
    {
      "id": "readiness-aborted",
      "expected": true
    },
    {
      "id": "no-stale-write",
      "expected": true
    },
    {
      "id": "fresh-start-true",
      "expected": true
    },
    {
      "id": "root-shown",
      "expected": true
    },
    {
      "id": "current-failure-rejects",
      "expected": true
    },
    {
      "id": "old-work-aborted",
      "expected": true
    },
    {
      "id": "old-view-destroyed",
      "expected": true
    },
    {
      "id": "no-stale-commit",
      "expected": true
    },
    {
      "id": "replacement-completed",
      "expected": true
    },
    {
      "id": "station-survives-cancel",
      "expected": true
    },
    {
      "id": "stopped-root-destroyed",
      "expected": true
    },
    {
      "id": "close-cancels-flight",
      "expected": true
    },
    {
      "id": "application-destroyed",
      "expected": true
    }
  ],
  css: css + lessonCSS + spacingCSS + motionCSS,
  readingGuide: [
    { label: '1. Wait before showing the app', file: 'readiness.js', symbol: 'MissionControl.onBeforeStart', detail: 'MissionControl.onBeforeStart awaits readiness. onStart shows the root View only after success.' },
    { label: '2. A View owns unfinished work', file: 'flight.js', symbol: 'Mission.fly', detail: 'Mission.fly awaits the animation. onBeforeDestroy aborts it; our code prevents a cancelled delivery.' },
    { label: '3. Cancel through the Region', file: 'flight.js', symbol: 'FlightDeck.cancelFlight', detail: 'FlightDeck.cancelFlight empties the worker Region. Marionette destroys its View and invokes our abort hook.' },
  ],
  sourceFiles: projects['mission-control']
},
];

export function listRecipes() {
  return recipes.map(({ css, sourceFiles, ...metadata }) => structuredClone({ ...metadata, runtime: recipeRuntime }));
}

export function getRecipe(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).some(key => key !== 'id') || typeof input.id !== 'string') throw new Error('Expected {id} from listExamples().');
  const recipe = recipes.find(recipe => recipe.id === input.id);
  if (!recipe) throw new Error('Unknown example. Use listExamples() to discover exact ids.');
  return structuredClone({ ...recipe, runtime: recipeRuntime });
}

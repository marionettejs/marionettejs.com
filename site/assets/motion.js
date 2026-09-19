import { View, Region } from '../vendor/marionette.js';

const hero = document.querySelector('.night-hero');
const rig = document.querySelector('[data-rig]');
const scene = document.querySelector('.ownership-scene');
const description = document.querySelector('#phase-description');
const command = document.querySelector('#story-command');
const controls = [...document.querySelectorAll('[data-phase][type="button"]')];
const play = document.querySelector('.sequence-play');
const toggle = document.querySelector('.motion-toggle');
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
let paused = false;
let frame = 0;
let pointerX = 0;
let pointerY = 0;
let invitationPointer = null;
let playback = 0;
let phase = 0;
const eventOutput = document.querySelector('#lifecycle-events');
const region = new Region({ el:scene.querySelector('.lifecycle-slot') });
const events = [];
let previous = null;
let ghostTimer = 0;
function clearGhost() {
  clearTimeout(ghostTimer);
  scene.querySelector('.lifecycle-ghost')?.remove();
}
function record(name, event) {
  events.push(`${name}: ${event}`);
  eventOutput.textContent = events.join(' → ');
}
const Card = View.extend({
  templateContext() { return this.options; },
  template:({ name, number }) => `<span>VIEW / ${number}</span><strong>${name}</strong><div class="skeleton"><i></i><i></i><i></i></div><small>rendered → attached</small>`
});
const NotesView = Card.extend({ className:'diagram-view old-view' });
const TasksView = Card.extend({ className:'diagram-view new-view' });
function createCard(next) {
  const view = next === 0 ? new NotesView({name:'NotesView',number:'01'}) : new TasksView({name:'TasksView',number:'02'});
  for (const event of ['render', 'attach', 'destroy']) view.on(event, () => record(view.options.name, event));
  view.el.dataset.viewId = view.cid;
  return view;
}
function reflectRegion() {
  const view = region.currentView;
  phase = view ? (view instanceof NotesView ? 0 : 1) : 2;
  scene.dataset.phase = String(phase);
  scene.dataset.regionId = region.cid;
  scene.dataset.currentView = view?.cid || '';
  scene.dataset.attached = String(!!view?.isAttached());
  scene.dataset.destroyed = String(!!previous?.isDestroyed());
  scene.dataset.previousView = previous?.cid || '';
  const message = view ? `${view.options.name} rendered and attached.` : 'The Region is empty and ready for another View.';
  const cleanup = previous?.isDestroyed() ? `${previous.options.name} destroyed. ` : '';
  description.textContent = cleanup + message;
  scene.setAttribute('aria-label', `Live Marionette lifecycle: ${cleanup}${message}`);
  scene.querySelector('[data-receipt]').textContent = cleanup.trim();
  for (const button of controls) button.setAttribute('aria-pressed', String(Number(button.dataset.phase) === phase));
}
region.on('before:empty', (_, view) => {
  previous = view;
  if (paused || reduced.matches || document.hidden) return;
  // This decorative copy has no View instance, event handlers, or Region ownership.
  const ghost = view.el.cloneNode(true);
  ghost.removeAttribute('data-view-id');
  ghost.classList.add('lifecycle-ghost');
  ghost.setAttribute('aria-hidden', 'true');
  ghost.inert = true;
  scene.append(ghost);
  ghost.addEventListener('animationend', () => ghost.remove(), {once:true});
  ghostTimer = setTimeout(() => ghost.remove(), 850);
});
region.on('show', reflectRegion);
region.on('empty', () => {
  if (!region.isSwappingView()) reflectRegion();
});
function selectPhase(next) {
  if (next === phase && region.hasView()) return;
  if (next === 2 && !region.hasView()) return;
  clearGhost();
  events.length = 0;
  previous = null;
  command.textContent = next === 2 ? 'region.empty();' : `region.show(${next === 0 ? 'notes' : 'tasks'});`;
  if (next === 2) region.empty();
  else region.show(createCard(next));
}
// Replace the readable, no-JavaScript illustration with the actual owned View.
scene.classList.add('lifecycle-live');
region.show(createCard(0));
eventOutput.hidden = false;
function stopPlayback() {
  clearTimeout(playback);
  playback = 0;
  play.textContent = 'Play the lifecycle ▷';
  play.setAttribute('aria-label', 'Play the lifecycle');
}
function advance() {
  selectPhase(phase + 1);
  if (phase === 2) stopPlayback();
  else playback = setTimeout(advance, 2400);
}
function render() {
  frame = 0;
  const off = paused || reduced.matches || document.hidden;
  document.documentElement.classList.toggle('motion-off', off);
  const heroBox = hero.getBoundingClientRect();
  const heroScroll = Math.max(0, Math.min(heroBox.height, -heroBox.top));
  hero.style.setProperty('--grid-y', `${off ? 0 : heroScroll * .12}px`);
  rig.style.setProperty('--rig-tilt', `${off ? 0 : pointerX * 10}deg`);
  rig.style.setProperty('--rig-y', `${off ? 0 : pointerY * 6}px`);
  const sceneBox = scene.getBoundingClientRect();
  scene.style.setProperty('--scene-lift', `${off ? 0 : Math.max(-12, Math.min(12, (innerHeight / 2 - sceneBox.top) * .04))}px`);
  const honesty = document.querySelector('.night-honesty');
  honesty.style.setProperty('--mark-y', `${off ? 0 : Math.max(-100, Math.min(100, (innerHeight / 2 - honesty.getBoundingClientRect().top) * .1))}px`);
  let starTilt = 0;
  let starPresence = 0;
  if (!off && finePointer.matches && innerWidth > 760 && invitationPointer) {
    const box = invitationMark.parentElement.getBoundingClientRect();
    const dx = invitationPointer.x - (box.left + box.width / 2);
    const dy = invitationPointer.y - (box.top + box.height / 2);
    starPresence = Math.max(0, 1 - Math.hypot(dx, dy) / 240);
    starTilt = -Math.max(-1, Math.min(1, dx / 80)) * 24 * starPresence;
  }
  invitationMark.style.setProperty('--star-tilt', `${starTilt}deg`);
  invitationMark.style.setProperty('--star-scale', String(1 + starPresence * .045));
  invitationMark.style.setProperty('--star-light', String(1 + starPresence * .18));
}
function requestRender() {
  if (!frame) frame = requestAnimationFrame(render);
}
function refreshMotion() {
  const off = paused || reduced.matches;
  if (off) { stopPlayback(); clearGhost(); invitationPointer = null; }
  toggle.disabled = reduced.matches;
  toggle.setAttribute('aria-pressed', String(off));
  toggle.textContent = reduced.matches ? 'Reduced motion enabled' : paused ? 'Restore motion' : 'Reduce motion';
  play.disabled = off;
  document.documentElement.classList.toggle('motion-off', off);
  requestRender();
}
for (const button of controls) button.addEventListener('click', () => {
  stopPlayback();
  selectPhase(Number(button.dataset.phase));
});
play.addEventListener('click', () => {
  if (playback) { stopPlayback(); return; }
  selectPhase(0);
  play.textContent = 'Stop playback □';
  play.setAttribute('aria-label', 'Stop playback');
  playback = setTimeout(advance, 2400);
});
toggle.addEventListener('click', () => { paused = !paused; refreshMotion(); });
rig.addEventListener('pointermove', event => {
  if (!finePointer.matches || paused || reduced.matches) return;
  const box = rig.getBoundingClientRect();
  pointerX = (event.clientX - box.left) / box.width - .5;
  pointerY = (event.clientY - box.top) / box.height - .5;
  requestRender();
});
rig.addEventListener('pointerleave', () => { pointerX = 0; pointerY = 0; requestRender(); });
addEventListener('scroll', requestRender, { passive:true });
addEventListener('resize', requestRender);
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { stopPlayback(); invitationPointer = null; }
  requestRender();
});
reduced.addEventListener('change', refreshMotion);
addEventListener('pagehide', event => {
  stopPlayback(); clearGhost(); cancelAnimationFrame(frame); frame = 0;
  if (!event.persisted) { region.off(); region.destroy(); }
});
addEventListener('pageshow', requestRender);
for (const button of controls) button.disabled = false;
description.setAttribute('aria-live', 'polite');
description.setAttribute('aria-atomic', 'true');
toggle.hidden = false;
refreshMotion();

// A static thread joins the two sections; it needs layout updates, not animation.
const opening = document.querySelector('.opening-act');
const thread = opening.querySelector('.opening-thread');
const invitationMark = opening.querySelector('.invitation-thread span');
const invitation = opening.querySelector('.agent-invitation');
invitation.addEventListener('pointermove', event => {
  if (!finePointer.matches || paused || reduced.matches || event.pointerType === 'touch') return;
  invitationPointer = { x:event.clientX, y:event.clientY };
  requestRender();
});
invitation.addEventListener('pointerleave', () => { invitationPointer = null; requestRender(); });
addEventListener('blur', () => { invitationPointer = null; requestRender(); });
finePointer.addEventListener('change', () => { invitationPointer = null; requestRender(); });
function connectThread() {
  if (innerWidth <= 760) { opening.classList.remove('thread-connected'); return; }
  const bounds = opening.getBoundingClientRect();
  const card = opening.querySelector('.demo').getBoundingClientRect();
  const band = opening.querySelector('.hero-bottom').getBoundingClientRect();
  // Measure the fixed suspension point, not the star's animated bounds.
  const mark = invitationMark.parentElement.getBoundingClientRect();
  const x1 = card.right - bounds.left - 22;
  const y1 = card.bottom - bounds.top;
  const x2 = mark.left + mark.width / 2 - bounds.left;
  const y2 = mark.top + (mark.height - invitationMark.offsetHeight) / 2 - bounds.top;
  const bend = band.top + band.height / 2 - bounds.top;
  const radius = 24;
  thread.setAttribute('viewBox', `0 0 ${bounds.width} ${bounds.height}`);
  thread.querySelector('path').setAttribute('d', `M ${x1} ${y1} V ${bend-radius} Q ${x1} ${bend} ${x1-radius} ${bend} H ${x2+radius} Q ${x2} ${bend} ${x2} ${bend+radius} V ${y2}`);
  opening.classList.add('thread-connected');
}
const layoutObserver = new ResizeObserver(connectThread);
layoutObserver.observe(opening);
layoutObserver.observe(rig);
layoutObserver.observe(invitationMark);
connectThread();

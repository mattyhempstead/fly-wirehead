import { createMatrix } from './matrix-scene.js';
import { MatrixFeed } from './matrix-feed.js';
import { createPlayback, createFrameClock } from './simulation.js';
import { BrainClient } from './backend.js';
import { STATION_COUNT } from './matrix-timeline.js';

const $ = selector => document.querySelector(selector), canvas = $('#scene');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const playback = createPlayback(), state = playback.state;
const feed = new MatrixFeed({ reducedMotion });
let lab, status = null, connection = 'CONNECTING', paused = reducedMotion, failed = false, sceneRendered = false, view = 0;
let commandPending = false, frames = 0, fpsElapsed = 0, fps = 0;
try { lab = createMatrix(canvas, feed); }
catch (error) { failed = true; console.error(error); $('#scene-error').hidden = false; }
const client = new BrainClient({
  reducedMotion,
  captureFrame: () => sceneRendered && !paused && !state.paused && !failed ? feed.captureFrame() : null,
  onStatus(data) {
    status = data; connection = data.phase === 'ready' ? 'CONNECTED' : data.phase.toUpperCase();
    if (data.telemetry) { state.pam11Hz = data.telemetry.pam11_hz; state.motorHz = data.telemetry.motor_hz; state.turnHz = data.telemetry.turn_hz; }
    updateLabels();
  },
  onError(error) { status = null; connection = 'OFFLINE'; state.pam11Hz = state.motorHz = state.turnHz = 0; updateLabels(); }
});
function updateLabels() {
  $('#brain-state').textContent = status?.phase === 'ready' ? (status.paused ? 'SHARED BRAIN PAUSED' : 'SHARED BRAIN CONNECTED') : `SHARED BRAIN ${connection}`;
  $('#brain-status').classList.toggle('connected', status?.phase === 'ready' && !status.paused);
  $('#spike-value').textContent = status?.telemetry ? status.telemetry.total_spikes.toLocaleString() : '—';
  $('#input-source').textContent = feed.sensorStation === null ? 'Waiting for phone pixels' : `Reading station ${String(feed.sensorStation + 1).padStart(2, '0')} / 64`;
  $('#pause').textContent = paused ? 'Resume floor' : 'Pause floor'; $('#pause').setAttribute('aria-pressed', String(paused));
  $('#floor-state').textContent = !feed.ready ? 'LOADING FOOTAGE' : paused ? 'FLOOR PAUSED' : '64 STATIONS ONLINE';
  $('#engine-message').textContent = feed.error || (connection === 'OFFLINE' ? 'Visual demonstration running. Start the local Python server to connect the shared brain.' : status?.phase === 'loading' ? 'The floor is running while the local connectome loads.' : '');
  if (feed.error) { $('#scene-error').textContent = feed.error; $('#scene-error').hidden = false; }
}
async function togglePause() {
  paused = !paused; updateLabels();
  if (status?.phase === 'ready') {
    try { await client.action(paused ? 'pause' : 'resume'); } catch { /* The visual floor can still be paused offline. */ }
  }
}
function setView(index) {
  view = lab?.setView(index) ?? 0;
  document.querySelectorAll('[data-view]').forEach(button => button.setAttribute('aria-pressed', String(Number(button.dataset.view) === view)));
}
async function fullscreen() {
  try { if (document.fullscreenElement) await document.exitFullscreen(); else await $('#scene-wrap').requestFullscreen(); }
  catch { $('#engine-message').textContent = 'Fullscreen is unavailable in this browser.'; }
}
$('#pause').addEventListener('click', () => void togglePause());
$('#fullscreen').addEventListener('click', () => void fullscreen());
document.querySelectorAll('[data-view]').forEach(button => button.addEventListener('click', () => setView(Number(button.dataset.view))));
let pointer = null;
canvas.addEventListener('pointerdown', event => { if (event.button !== 0) return; pointer = { id: event.pointerId, x: event.clientX, y: event.clientY }; canvas.setPointerCapture(event.pointerId); });
canvas.addEventListener('pointermove', event => {
  if (pointer?.id !== event.pointerId) return;
  lab?.orbit(event.clientX - pointer.x, event.clientY - pointer.y); pointer.x = event.clientX; pointer.y = event.clientY;
});
for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) canvas.addEventListener(name, () => pointer = null);
canvas.addEventListener('wheel', event => { event.preventDefault(); lab?.zoom(event.deltaY); }, { passive: false });
document.addEventListener('keydown', event => {
  if (event.metaKey || event.ctrlKey || event.altKey || /INPUT|TEXTAREA|SELECT|BUTTON|A/.test(document.activeElement?.tagName)) return;
  if (['Space', 'KeyC', 'KeyF'].includes(event.code)) event.preventDefault();
  if (event.repeat) return;
  if (event.code === 'Space') void togglePause();
  if (event.code === 'KeyC') setView((view + 1) % 3);
  if (event.code === 'KeyF') void fullscreen();
});
const clock = createFrameClock(); let hudClock = 0;
function frame(now) {
  if (failed) return;
  const dt = clock(now);
  if (!document.hidden) {
    try {
      playback.setPaused(paused || !feed.ready); playback.tick(dt);
      feed.render(state.time); lab.render(state.time, dt, state); sceneRendered = true;
      frames++; fpsElapsed += dt;
      if (fpsElapsed >= 1) { fps = Math.round(frames / fpsElapsed); frames = 0; fpsElapsed = 0; }
      hudClock += dt; if (hudClock >= .3) { hudClock = 0; updateLabels(); }
    } catch (error) {
      console.error(error); failed = true; sceneRendered = false;
      $('#scene-error').textContent = 'The factory scene stopped. Reload to restart the display.'; $('#scene-error').hidden = false;
      return;
    }
  }
  requestAnimationFrame(frame);
}
updateLabels(); requestAnimationFrame(frame); void feed.load().then(updateLabels); client.start();
window.addEventListener('pagehide', () => { client.stop(); feed.dispose(); lab?.dispose(); }, { once: true });
if (document.modelContext?.registerTool) {
  const lifecycle = new AbortController();
  try {
    Promise.resolve(document.modelContext.registerTool({
      name: 'control_fly_matrix', title: 'Control the fly matrix demonstration',
      description: 'Inspect 64 independent feeds and the shared neural measurements, select factory, row, or station camera views, and pause or resume the floor.',
      inputSchema: { type: 'object', properties: { action: { type: 'string', enum: ['status', 'pause', 'resume', 'factory_view', 'row_view', 'station_view', 'save'] } }, required: ['action'], additionalProperties: false },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      async execute(input) {
        if (commandPending) throw new Error('A command is already running');
        commandPending = true;
        try {
          if (input.action === 'pause' && !paused || input.action === 'resume' && paused) await togglePause();
          else if (input.action === 'factory_view') setView(0);
          else if (input.action === 'row_view') setView(1);
          else if (input.action === 'station_view') setView(2);
          else if (input.action === 'save') await client.action('save');
          else if (!['status', 'pause', 'resume'].includes(input.action)) throw new TypeError('Unknown action');
          return { connection, paused, seconds: state.time, stationCount: STATION_COUNT, sourceVideos: feed.clips.length,
            sourceStation: feed.sensorStation, rendering: { ...lab?.stats(), fps }, telemetry: status?.telemetry ?? null,
            feeds: feed.frames.map(frame => ({ station: frame.id + 1, video: feed.clips[frame.current].id, seconds: +frame.currentTime.toFixed(2), swipe: +frame.gesture.toFixed(2) })) };
        } finally { commandPending = false; }
      }
    }, { signal: lifecycle.signal })).catch(console.warn);
  } catch (error) { console.warn(error); }
  window.addEventListener('pagehide', () => lifecycle.abort(), { once: true });
}

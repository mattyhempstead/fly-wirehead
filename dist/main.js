import { createMatrix } from './matrix-scene.js';
import { MatrixFeed } from './matrix-feed.js';
import { createPlayback, createFrameClock } from './simulation.js';
import { BrainClient } from './backend.js';
import { STATION_COUNT } from './matrix-timeline.js';
import { bindOrbitInput } from './matrix-camera.js';

const $ = selector => document.querySelector(selector), canvas = $('#scene');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const playback = createPlayback(), state = playback.state;
const feed = new MatrixFeed({ reducedMotion });
let lab, status = null, connection = 'CONNECTING', paused = reducedMotion, failed = false, sceneRendered = false, view = 0;
let commandPending = false, frames = 0, fpsElapsed = 0, fps = 0;
let revealPlayed = false, dragMode = 'orbit';
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
  $('#input-source').textContent = feed.sensorStation === null ? 'Waiting for phone pixels' : `Reading station ${String(feed.sensorStation + 1).padStart(2, '0')} / ${STATION_COUNT}`;
  $('#pause').textContent = paused ? 'Resume floor' : 'Pause floor'; $('#pause').setAttribute('aria-pressed', String(paused));
  $('#engine-message').textContent = feed.error || (connection === 'OFFLINE' ? 'Visual demonstration running. Start the local Python server to connect the shared brain.' : status?.phase === 'loading' ? 'The floor is running while the local connectome loads.' : '');
  if (feed.error) { $('#scene-error').textContent = feed.error; $('#scene-error').hidden = false; }
  updateCameraControls();
}
async function togglePause() {
  paused = !paused; updateLabels();
  if (status?.phase === 'ready') {
    try { await client.action(paused ? 'pause' : 'resume'); } catch { /* The visual floor can still be paused offline. */ }
  }
}
function setView(index) {
  lab?.setView(index); updateCameraControls();
}
function updateCameraControls() {
  const camera = lab?.cameraState();
  view = camera?.view ?? 0;
  document.querySelectorAll('[data-view]').forEach(button => button.setAttribute('aria-pressed', String(Number(button.dataset.view) === view)));
  $('#reveal').textContent = camera?.reveal ? 'Restart reveal' : revealPlayed ? 'Replay reveal' : 'Play reveal';
  $('#reveal').disabled = !feed.ready || failed;
}
async function startReveal() {
  if (!feed.ready || failed) return;
  lab.startReveal(); revealPlayed = true;
  updateCameraControls();
  if (paused) await togglePause();
}
async function fullscreen() {
  try { if (document.fullscreenElement) await document.exitFullscreen(); else await $('#scene-wrap').requestFullscreen(); }
  catch { $('#engine-message').textContent = 'Fullscreen is unavailable in this browser.'; }
}
$('#pause').addEventListener('click', () => void togglePause());
$('#fullscreen').addEventListener('click', () => void fullscreen());
$('#reveal').addEventListener('click', () => void startReveal());
document.querySelectorAll('[data-view]').forEach(button => button.addEventListener('click', () => setView(Number(button.dataset.view))));
const panDirections = { left: [-1, 0], up: [0, -1], down: [0, 1], right: [1, 0] };
function panView(direction, distance = .12) {
  const [dx, dy] = panDirections[direction], rect = canvas.getBoundingClientRect();
  lab?.pan(dx * rect.height * distance, dy * rect.height * distance, rect.height, rect.width);
  updateCameraControls();
}
document.querySelectorAll('[data-drag-mode]').forEach(button => button.addEventListener('click', () => {
  dragMode = button.dataset.dragMode;
  document.querySelectorAll('[data-drag-mode]').forEach(option => option.setAttribute('aria-pressed', String(option.dataset.dragMode === dragMode)));
  canvas.classList.toggle('pan-mode', dragMode === 'pan');
}));
document.querySelectorAll('[data-pan]').forEach(button => button.addEventListener('click', () => panView(button.dataset.pan)));
$('#recenter').addEventListener('click', () => { lab?.resetPan(); updateCameraControls(); });
const unbindOrbit = lab ? bindOrbitInput(canvas, lab, { getDragMode: () => dragMode }) : () => {};
document.addEventListener('keydown', event => {
  if (event.metaKey || event.ctrlKey || event.altKey || /INPUT|TEXTAREA|SELECT|BUTTON|A/.test(document.activeElement?.tagName)) return;
  const direction = event.code.startsWith('Arrow') ? event.code.slice(5).toLowerCase() : null;
  if (direction in panDirections && document.activeElement === canvas) {
    event.preventDefault(); panView(direction, .04); return;
  }
  if (['Space', 'KeyC', 'KeyF'].includes(event.code)) event.preventDefault();
  if (event.repeat) return;
  if (event.code === 'Space') void togglePause();
  if (event.code === 'KeyC') setView((view + 1) % 4);
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
window.addEventListener('pagehide', () => { unbindOrbit(); client.stop(); feed.dispose(); lab?.dispose(); }, { once: true });
if (document.modelContext?.registerTool) {
  const lifecycle = new AbortController();
  try {
    Promise.resolve(document.modelContext.registerTool({
      name: 'control_fly_matrix', title: 'Control the fly matrix demonstration',
      description: 'Inspect 96 independent feeds and shared neural measurements, play the reveal from one fly to 10,000 blocks, select camera views, and pause or resume the floor.',
      inputSchema: { type: 'object', properties: { action: { type: 'string', enum: ['status', 'pause', 'resume', 'reveal', 'factory_view', 'row_view', 'station_view', 'blocks_view', 'save'] } }, required: ['action'], additionalProperties: false },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      async execute(input) {
        if (commandPending) throw new Error('A command is already running');
        commandPending = true;
        try {
          if (input.action === 'pause' && !paused || input.action === 'resume' && paused) await togglePause();
          else if (input.action === 'factory_view') setView(0);
          else if (input.action === 'row_view') setView(1);
          else if (input.action === 'station_view') setView(2);
          else if (input.action === 'blocks_view') setView(3);
          else if (input.action === 'reveal') await startReveal();
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

import { createRecoveryLab } from './recovery-scene.js';
import { createPlayback, createFrameClock } from './simulation.js';
import { BrainClient } from './backend.js';
import { dopaminePlot } from './dopamine-plot.js';
import { recoveryFrame, SCENES, DURATION } from './recovery-timeline.js';

const $ = selector => document.querySelector(selector);
const canvas = $('#scene'), reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const playback = createPlayback(), state = playback.state;
$('#sequence-duration').textContent = `From the beginning · ${SCENES.length} scenes · ${DURATION} seconds`;
let lab, status = null, connection = 'CONNECTING', connectionError = '', sceneFailed = false, sceneRendered = false;
let current = recoveryFrame(0), hudClock = 0, messageTimer, commandPending = false;
try { lab = createRecoveryLab(canvas); }
catch (error) { sceneFailed = true; console.error(error); $('#scene-error').hidden = false; }
const client = new BrainClient({
  reducedMotion,
  captureFrame: () => sceneRendered && !sceneFailed && !state.paused && !document.hidden ? lab?.captureFrame() : null,
  onStatus(data) {
    if (data.phase === 'ready' && data.model?.experience !== 'recovery') throw new Error('Restart the local server from the recovery branch');
    status = data; connectionError = '';
    connection = data.phase === 'ready' ? (data.paused ? 'PAUSED' : 'CONNECTED') : data.phase.toUpperCase();
    playback.setPaused(sceneFailed || data.phase !== 'ready' || data.paused || document.hidden);
    if (data.telemetry) {
      state.pam11Hz = data.telemetry.pam11_hz; state.motorHz = data.telemetry.motor_hz; state.turnHz = data.telemetry.turn_hz;
    }
    updateLabels(); drawTelemetry();
  },
  onError(error) {
    status = null; connection = 'DISCONNECTED'; connectionError = error.message;
    playback.setPaused(true); state.pam11Hz = state.motorHz = state.turnHz = 0;
    updateLabels(); drawTelemetry();
  }
});
function showMessage(text) {
  clearTimeout(messageTimer); $('#scene-message').textContent = text;
  messageTimer = setTimeout(() => $('#scene-message').textContent = '', 3500);
}
async function command(action) {
  if (commandPending) return false;
  commandPending = true; updateLabels();
  try { await client.action(action); return true; }
  catch (error) { showMessage(error.message); return false; }
  finally { commandPending = false; updateLabels(); }
}
function setScene(index) {
  state.time = SCENES[Math.max(0, Math.min(SCENES.length - 1, index))].start;
  current = recoveryFrame(state.time); sceneRendered = false; lab?.resetCamera(); updateLabels();
}
function restart() { setScene(0); }
async function playSequence() {
  if (sceneFailed || status?.phase !== 'ready' || commandPending) return;
  if (await command('resume')) {
    restart();
    canvas.focus({ preventScroll: true });
    $('#scene-wrap').scrollIntoView({ block: 'start', behavior: reducedMotion ? 'auto' : 'smooth' });
  }
}
function updateLabels() {
  const t = status?.telemetry, ready = status?.phase === 'ready';
  $('#dopamine-value').textContent = Number.isFinite(t?.pam11_hz) ? t.pam11_hz.toFixed(1) : '—';
  $('#spike-value').textContent = t ? t.total_spikes.toLocaleString() : '—';
  $('#sample-label').textContent = t ? `in ${t.interval_ms} ms of neural time` : 'Waiting for a sample';
  $('#play-sequence').disabled = !ready || sceneFailed || commandPending;
  $('#play-sequence').setAttribute('aria-busy', String(commandPending));
  $('#engine-message').textContent = sceneFailed ? 'Visual input suspended' : status?.paused ? 'Simulation paused · Space to resume' : ready ? '' : connectionError || status?.message || 'Loading the local connectome…';
  document.body.classList.toggle('paused', Boolean(status?.paused));
  document.body.classList.toggle('disconnected', !ready);
}
async function fullscreen() {
  try { if (document.fullscreenElement) await document.exitFullscreen(); else await $('#scene-wrap').requestFullscreen(); }
  catch { showMessage('Fullscreen unavailable in this view'); }
}
$('#play-sequence').addEventListener('click', playSequence);
document.addEventListener('keydown', event => {
  if (event.altKey || event.ctrlKey || event.metaKey || document.activeElement?.closest('input, textarea, select, button, a, [contenteditable="true"]')) return;
  if (['Space', 'ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp', 'KeyR', 'KeyC', 'KeyF', 'KeyS'].includes(event.code)) event.preventDefault();
  if (event.repeat) return;
  if (event.code === 'Space') void command(status?.paused ? 'resume' : 'pause');
  if (['ArrowRight', 'ArrowDown'].includes(event.code)) setScene(current.index + 1);
  if (['ArrowLeft', 'ArrowUp'].includes(event.code)) setScene(current.index - 1);
  if (event.code === 'KeyR') restart();
  if (event.code === 'KeyC') lab?.resetCamera();
  if (event.code === 'KeyF') void fullscreen();
  if (event.code === 'KeyS') void command('save');
});
let pointer = null;
canvas.addEventListener('pointerdown', e => { if (e.button !== 0) return; pointer = { id: e.pointerId, x: e.clientX, y: e.clientY }; canvas.setPointerCapture(e.pointerId); });
canvas.addEventListener('pointermove', e => { if (!pointer || pointer.id !== e.pointerId) return; lab?.orbit(e.clientX - pointer.x, e.clientY - pointer.y); pointer.x = e.clientX; pointer.y = e.clientY; });
for (const event of ['pointerup', 'pointercancel', 'lostpointercapture']) canvas.addEventListener(event, () => pointer = null);
document.addEventListener('visibilitychange', () => playback.setPaused(sceneFailed || status?.phase !== 'ready' || Boolean(status?.paused) || document.hidden));
function contextFor(element) {
  const rect = element.getBoundingClientRect(), dpr = Math.min(devicePixelRatio, 2);
  const w = Math.round(rect.width * dpr), h = Math.round(rect.height * dpr);
  if (element.width !== w || element.height !== h) { element.width = w; element.height = h; }
  const ctx = element.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, w: rect.width, h: rect.height };
}
function drawTelemetry() {
  const { ctx: c, w, h } = contextFor($('#dopamine-chart'));
  const { points, minimum, maximum } = dopaminePlot(status?.history);
  c.clearRect(0, 0, w, h);
  $('#dopamine-range').textContent = points.length ? `${minimum}–${maximum} Hz · AUTO SCALE` : 'WAITING FOR DATA';
  const left = 32, right = w - 5, top = 7, bottom = h - 6;
  const y = rate => bottom - (rate - minimum) / (maximum - minimum) * (bottom - top);
  c.font = '11px monospace'; c.textAlign = 'left'; c.textBaseline = 'middle';
  for (let i = 0; i <= 2; i++) {
    const rate = minimum + (maximum - minimum) * i / 2;
    c.strokeStyle = '#698f6840'; c.lineWidth = .7;
    c.beginPath(); c.moveTo(left, y(rate)); c.lineTo(right, y(rate)); c.stroke();
    c.fillStyle = '#a3baa3'; c.fillText(`${Number(rate.toFixed(1))}`, 0, y(rate));
  }
  if (!points.length) return;
  const start = points[0].simMs, span = Math.max(1, points.at(-1).simMs - start);
  const x = point => points.length === 1 ? right : left + (point.simMs - start) / span * (right - left);
  c.beginPath(); points.forEach((point, i) => i ? c.lineTo(x(point), y(point.rate)) : c.moveTo(x(point), y(point.rate)));
  c.strokeStyle = '#c4f86a'; c.lineWidth = 2; c.lineJoin = 'round'; c.stroke();
  c.lineTo(x(points.at(-1)), bottom); c.lineTo(x(points[0]), bottom); c.closePath();
  const fill = c.createLinearGradient(0, top, 0, bottom); fill.addColorStop(0, '#c4f86a30'); fill.addColorStop(1, '#c4f86a04');
  c.fillStyle = fill; c.fill();
  c.beginPath(); c.arc(x(points.at(-1)), y(points.at(-1).rate), 3, 0, Math.PI * 2); c.fillStyle = '#e4ffaa'; c.fill();
}

window.addEventListener('resize', drawTelemetry);
const frameClock = createFrameClock();
function frame(now) {
  if (sceneFailed) return;
  const dt = frameClock(now);
  if (!document.hidden) {
    sceneRendered = false;
    try {
      playback.tick(dt); state.time = Math.min(state.time, DURATION);
      current = lab.render(state.time, dt, state); sceneRendered = true;
      hudClock += dt; if (hudClock > .12) { hudClock = 0; updateLabels(); }
    } catch (error) {
      console.error(error); sceneFailed = true; playback.setPaused(true);
      $('#scene-error').textContent = 'The 3D scene stopped. Visual input is suspended. Reload to try again.';
      $('#scene-error').hidden = false; updateLabels(); return;
    }
  }
  requestAnimationFrame(frame);
}
updateLabels(); drawTelemetry(); requestAnimationFrame(frame); client.start();
window.addEventListener('pagehide', () => { client.stop(); lab?.dispose(); }, { once: true });
const context = document.modelContext;
if (context?.registerTool) {
  const lifecycle = new AbortController();
  try { Promise.resolve(context.registerTool({
    name: 'control_fly_recovery', title: 'Control the fly recovery simulation',
    description: 'Read measured brain activity, pause or resume the simulation, advance to the next scene, replay the choreography without resetting the brain, or save the brain.',
    inputSchema: { type: 'object', properties: { action: { type: 'string', enum: ['status', 'pause', 'resume', 'next_scene', 'previous_scene', 'restart', 'save'] } }, required: ['action'], additionalProperties: false },
    annotations: { readOnlyHint: false, untrustedContentHint: false },
    async execute(input) {
      if (!input || Object.keys(input).length !== 1 || !['status', 'pause', 'resume', 'next_scene', 'previous_scene', 'restart', 'save'].includes(input.action)) throw new TypeError('Invalid action');
      if (input.action === 'next_scene') setScene(current.index + 1);
      else if (input.action === 'previous_scene') setScene(current.index - 1);
      else if (input.action === 'restart') restart();
      else if (input.action !== 'status') await client.action(input.action);
      return { connection, paused: state.paused, scene: current.id, shot: current.shot, seconds: state.time, stimulationAttached: status?.stimulation_attached ?? null, telemetry: status?.telemetry ?? null };
    }
  }, { signal: lifecycle.signal })).catch(console.warn); } catch (error) { console.warn(error); }
  window.addEventListener('pagehide', () => lifecycle.abort(), { once: true });
}

// Local bridge. Measurements stay null until the native engine supplies them.
export class BrainClient {
  constructor({ captureFrame, onStatus, onError, reducedMotion = false, fetcher = globalThis.fetch.bind(globalThis) }) {
    Object.assign(this, { captureFrame, onStatus, onError, reducedMotion, fetcher });
    this.clientId = globalThis.crypto.randomUUID();
    this.token = null; this.timer = null; this.stopped = true; this.status = null; this.epoch = 0; this.initialized = false;
  }
  async request(path, options = {}) {
    const response = await this.fetcher(path, { ...options, cache: 'no-store', signal: AbortSignal.timeout(15000), headers: { 'X-Fly-Token': this.token || '', ...options.headers } });
    if (!response.headers.get('content-type')?.includes('application/json')) throw new Error('Start the local app: uv run flywirehead run');
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || `Local engine returned ${response.status}`);
    return data;
  }
  start() { this.stopped = false; void this.poll(); }
  stop() { this.stopped = true; clearTimeout(this.timer); }
  publish(status) { this.status = status; this.onStatus(status); }
  async action(action) {
    if (!['pause', 'resume', 'stimulate', 'save'].includes(action)) throw new TypeError('Unknown brain action');
    if (!this.token) throw new Error('The local brain is not connected');
    this.epoch++;
    const status = await this.request('/api/control', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action }) });
    this.publish(status); return status;
  }
  async poll() {
    if (this.stopped) return;
    let delay = 350;
    try {
      if (!this.token) this.token = (await this.request('/api/session')).token;
      const epoch = this.epoch;
      let status = await this.request('/api/status');
      if (epoch !== this.epoch) return;
      if (!this.initialized && status.phase === 'ready') {
        this.initialized = true;
        if (this.reducedMotion) status = await this.action('pause');
      }
      this.publish(status);
      if (status.phase === 'ready' && !status.paused && !status.busy && !globalThis.document?.hidden) {
        const capture = this.captureFrame();
        if (capture) {
          const headers = { 'Content-Type': 'application/octet-stream', 'X-Fly-Client': this.clientId };
          if (capture.recovery) {
            headers['X-Fly-Experience'] = 'recovery';
            headers['X-Fly-Scene'] = capture.recovery.scene;
            headers['X-Fly-Attached'] = capture.recovery.attached ? 'true' : 'false';
          }
          await this.request('/api/frame', { method: 'POST', headers, body: capture.bytes || capture });
        }
      }
    } catch (error) {
      this.token = null; this.status = null; this.onError(error); delay = 2000;
    } finally {
      if (!this.stopped) this.timer = setTimeout(() => this.poll(), delay);
    }
  }
}

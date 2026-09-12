import { stations, COLUMNS, ROWS, stationFrame, bottomUpRGBA } from './matrix-timeline.js';

export class MatrixFeed {
  constructor({ reducedMotion = false } = {}) {
    this.reducedMotion = reducedMotion;
    this.width = 144; this.height = 256;
    this.canvas = document.createElement('canvas');
    this.canvas.width = COLUMNS * this.width; this.canvas.height = ROWS * this.height;
    this.ctx = this.canvas.getContext('2d', { alpha: false });
    this.ctx.fillStyle = '#111c22'; this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    this.sensor = document.createElement('canvas'); this.sensor.width = 90; this.sensor.height = 160;
    this.sensorContext = this.sensor.getContext('2d', { willReadFrequently: true });
    this.clips = []; this.images = []; this.frames = []; this.ready = false; this.error = '';
    this.version = 0; this.lastTick = -1; this.nextSensor = 0; this.sensorStation = null;
  }
  async load() {
    try {
      const response = await fetch('./media/matrix/manifest.json');
      if (!response.ok) throw new Error('Prepare the video cache: uv run python scripts/prepare_matrix.py');
      const manifest = await response.json();
      if (manifest.width !== this.width || manifest.height !== this.height || !manifest.clips?.length) throw new Error('Invalid factory video cache');
      this.manifest = manifest; this.clips = manifest.clips;
      this.images = await Promise.all(this.clips.map(async clip => {
        const response = await fetch(`./media/matrix/${clip.sheet}`);
        if (!response.ok) throw new Error(`Missing video cache: ${clip.id}`);
        return createImageBitmap(await response.blob());
      }));
      this.ready = true; this.render(0, true);
    } catch (error) { this.error = error.message; }
  }
  render(time, force = false) {
    if (!this.ready) return;
    this.frames = stations.map(station => stationFrame(station, time, this.clips, this.reducedMotion));
    const tick = Math.floor(time * 30);
    if (!force && tick === this.lastTick) return;
    this.lastTick = tick;
    const { ctx: c, width: w, height: h } = this;
    for (const frame of this.frames) {
      const x = frame.id % COLUMNS * w, y = Math.floor(frame.id / COLUMNS) * h;
      c.save(); c.beginPath(); c.rect(x, y, w, h); c.clip();
      if (frame.slide < 1) this.draw(frame.previous, frame.previousTime, x, y - frame.slide * h);
      this.draw(frame.current, frame.currentTime, x, y + (1 - frame.slide) * h);
      c.restore();
    }
    this.version++;
  }
  draw(index, time, x, y) {
    const { width: w, height: h } = this, clip = this.clips[index];
    const frame = Math.min(clip.frames - 1, Math.floor(time * this.manifest.fps));
    this.ctx.drawImage(this.images[index], frame % this.manifest.columns * w, Math.floor(frame / this.manifest.columns) * h, w, h, x, y, w, h);
  }
  captureFrame() {
    if (!this.ready || !this.frames.length) return null;
    const id = this.nextSensor;
    this.nextSensor = (id + 1) % stations.length; this.sensorStation = id;
    this.sensorContext.drawImage(this.canvas, id % COLUMNS * this.width, Math.floor(id / COLUMNS) * this.height, this.width, this.height, 0, 0, 90, 160);
    return bottomUpRGBA(this.sensorContext.getImageData(0, 0, 90, 160).data, 90, 160);
  }
  dispose() { this.images.forEach(image => image.close()); }
}

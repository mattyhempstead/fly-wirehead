"""Cache portrait video frames for 96 independent playheads without 96 decoders.

Run after download_videos.py. Only the existing user-selected footage is used.
"""
import json
import math
from pathlib import Path
import subprocess

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
WIDTH, HEIGHT, FPS, COLUMNS = 144, 256, 15, 10


def prepare():
    media = ROOT / "dist/media"
    output = media / "matrix"
    output.mkdir(exist_ok=True)
    clips = []
    for clip in json.loads((media / "playlist.json").read_text())["clips"]:
        source = media / clip["file"]
        if not source.exists():
            raise SystemExit("Run scripts/download_videos.py first")
        data = subprocess.check_output([
            "ffmpeg", "-v", "error", "-i", str(source), "-an", "-vf",
            f"fps={FPS},scale={WIDTH}:{HEIGHT}", "-f", "rawvideo", "-pix_fmt", "rgb24", "-",
        ])
        frame_bytes = WIDTH * HEIGHT * 3
        count = len(data) // frame_bytes
        if not count or len(data) % frame_bytes:
            raise ValueError(f"Invalid decoded frames: {source}")
        sheet = Image.new("RGB", (COLUMNS * WIDTH, math.ceil(count / COLUMNS) * HEIGHT))
        for i in range(count):
            frame = Image.frombytes("RGB", (WIDTH, HEIGHT), data[i * frame_bytes:(i + 1) * frame_bytes])
            sheet.paste(frame, (i % COLUMNS * WIDTH, i // COLUMNS * HEIGHT))
        target = output / f'{clip["id"]}.webp'
        sheet.save(target, quality=83, method=4)
        clips.append({**clip, "duration": min(clip["duration"], count / FPS), "sheet": target.name, "frames": count})
        print(f'{clip["id"]}: {count} frames', flush=True)
    (output / "manifest.json").write_text(json.dumps({"width": WIDTH, "height": HEIGHT, "fps": FPS,
                                                     "columns": COLUMNS, "clips": clips}, indent=2) + "\n")


if __name__ == "__main__":
    prepare()

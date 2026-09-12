"""Loopback-only app server. One worker owns all native neural state."""

from collections import deque
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import fcntl
import json
import os
from pathlib import Path
import secrets
import threading
import time
from urllib.parse import urlsplit
import webbrowser

from .engine import FRAME_HEIGHT, FRAME_WIDTH, PAM11_CURRENT_MV, FlyEngine, decode_frame

ROOT = Path(__file__).resolve().parents[1]
RECOVERY_SCENES = {"unplugged", "walking", "treadmill", "stairs", "victory"}


def atomic_json(path, data):
    temporary = path.with_suffix(".json.partial")
    temporary.write_text(json.dumps(data, allow_nan=False, indent=2) + "\n")
    temporary.replace(path)


class Experiment:
    def __init__(self, run_dir, *, neural_ms=50.0, fresh=False, frozen=False, video_reward=True, recovery=False, factory=FlyEngine, verifier=None):
        self.run_dir = Path(run_dir)
        self.run_dir.mkdir(parents=True, exist_ok=True)
        self.neural_ms, self.fresh, self.frozen = neural_ms, fresh, frozen
        self.video_reward = video_reward
        self.recovery = recovery
        self.stimulation_attached = True
        self.factory, self.verifier = factory, verifier
        self.condition = threading.Condition()
        self.pending = None
        self.stopping = False
        self.engine = None
        self.injection_requested = False
        self.save_requested = False
        self.control_revision = 0
        self.owner = None
        self.owner_seen = 0.0
        self.token = secrets.token_urlsafe(24)
        self.state = {"phase": "loading", "message": "Loading and verifying the full MaleCNS graph…", "paused": False, "busy": False, "sequence": 0, "telemetry": None, "history": [], "raster": [], "checkpoint": None, "model": None}
        self.thread = threading.Thread(target=self._work, name="fly-brain", daemon=False)

    def start(self):
        self.thread.start()

    def snapshot(self):
        with self.condition:
            # Worker replaces nested payloads rather than mutating published values.
            state = {**self.state, "frame_width": FRAME_WIDTH, "frame_height": FRAME_HEIGHT, "neural_ms": self.neural_ms, "stimulation_attached": self.stimulation_attached and self.video_reward}
            if state["telemetry"] and not state["busy"]:
                state["input_age_seconds"] = max(0, time.time() - state["telemetry"]["received_at"])
                if state["input_age_seconds"] > 3:
                    state["message"] = "Waiting for fresh screen pixels"
            return state

    def submit(self, body, client, *, recovery=None):
        if self.recovery:
            if not isinstance(recovery, dict) or set(recovery) != {"scene", "attached"} or recovery["scene"] not in RECOVERY_SCENES or not isinstance(recovery["attached"], bool):
                raise ValueError("A recovery scene and attachment state are required")
            if recovery["attached"] and recovery["scene"] != "unplugged":
                raise ValueError("Stimulation cannot be attached in a recovery exercise")
        elif recovery is not None:
            raise RuntimeError("Restart the local server from the recovery branch")
        frame = decode_frame(body)
        with self.condition:
            if self.state["phase"] != "ready":
                raise RuntimeError(self.state["message"])
            if self.state["paused"]:
                raise RuntimeError("Experiment is paused")
            now = time.monotonic()
            if self.owner not in (None, client) and now - self.owner_seen < 4:
                raise RuntimeError("Another observation window is supplying the frames")
            self.owner, self.owner_seen = client, now
            if self.recovery and not recovery["attached"]:
                # Detachment is irreversible for this worker, including camera replay.
                self.stimulation_attached = False
                self.injection_requested = False
            self.pending = (frame, time.time(), recovery["scene"] if self.recovery else "video")
            self.condition.notify_all()

    def control(self, action):
        if action not in {"pause", "resume", "stimulate", "save"}:
            raise ValueError("Unknown action")
        with self.condition:
            if self.state["phase"] != "ready":
                raise RuntimeError(self.state["message"])
            if action in {"pause", "resume"}:
                self.state["paused"] = action == "pause"
                self.control_revision += 1
                self.pending = None
                if action == "pause":
                    self.injection_requested = False
            elif action == "stimulate":
                if self.recovery:
                    raise RuntimeError("Manual stimulation is disabled during recovery")
                if self.state["paused"]:
                    raise RuntimeError("Resume before stimulating PAM11 cells")
                self.injection_requested = True
            else:
                self.save_requested = True
            self.condition.notify_all()
        return self.snapshot()

    def _save(self):
        self.engine.brain.checkpoint(self.run_dir / "brain.npz")
        saved = {"saved_at": time.time(), "sim_ms": self.engine.brain.sim_ms, "pending_stimulus_ms": self.engine.pending_pulse_ms}
        atomic_json(self.run_dir / "checkpoint.json", saved)
        with self.condition:
            self.state["checkpoint"] = saved

    def _work(self):
        try:
            if self.verifier is None:
                from .data import verify
                verified = verify()
            else:
                verified = self.verifier()
            self.engine = self.factory(frozen=self.frozen)
            b = self.engine.brain
            checkpoint = self.run_dir / "brain.npz"
            if checkpoint.exists() and not self.fresh:
                b.restore(checkpoint)
                b.weights_frozen = self.frozen
                # No queued stimulus is replayed after a restart.
            reward = {"video_enabled": self.video_reward, "target": "PAM11", "cells": len(b.circuit["reward"]), "current_mv_equivalent": PAM11_CURRENT_MV, "trigger": "Accepted eye-view frames while attached; permanently off after unplugging" if self.recovery else "Each accepted playing-video observation", "manual_pulse_ms": 0 if self.recovery else 200, "overlap": "Manual and video current do not stack"}
            model = {**verified, "experience": "recovery" if self.recovery else "feed", "backend": "Python / C++17", "dt_ms": b.dt, "plastic_edges": len(b.circuit["edges"]), "retinal_inputs": len(b.retina) + len(b.r8), "sample_cells": self.engine.sample_cells, "frozen": self.frozen, "reward": reward, "physiology_validated": False}
            atomic_json(self.run_dir / "provenance.json", {"model": model, "upstream": json.loads((ROOT / "flywirehead/upstream.json").read_text()), "neural_ms_per_frame": self.neural_ms, "frame_source": "90x160 RGBA rendered from a camera at the fly's eyes in the current 3D recovery world; observer camera and HUD excluded" if self.recovery else "90x160 RGBA captured from the displayed short; flipped to RGB", "reward": reward, "animation": "Choreographed rehabilitation with measured motor and turning modulation; not learned gait or validated recovery" if self.recovery else "Artistic mapping of measured PAM11, MN9/DNp09 and DNa02 spike rates; choreographed foreleg swipe", "started_at": time.time()})
            with self.condition:
                self.state.update(phase="ready", message="Waiting for screen pixels", model=model, restored_ms=b.sim_ms)
            print(f"Brain ready: {b.n:,} neurons, {len(b.post):,} connections; {b.sim_ms:.1f} ms simulated", flush=True)
            history, raster = deque(maxlen=120), deque(maxlen=120)
            last_save = time.monotonic()
            with (self.run_dir / "events.jsonl").open("a", buffering=1) as log:
                while True:
                    with self.condition:
                        self.condition.wait_for(lambda: self.stopping or self.save_requested or (self.pending is not None and not self.state["paused"]))
                        if self.stopping:
                            break
                        save = self.save_requested
                        self.save_requested = False
                        if save:
                            item = None
                        else:
                            item, self.pending = self.pending, None
                            injection, self.injection_requested = self.injection_requested, False
                            drive = self.video_reward and (not self.recovery or self.stimulation_attached)
                        self.state["busy"] = True
                    if save:
                        self._save()
                    else:
                        frame, received, observed_scene = item
                        if self.recovery:
                            self.engine.pending_pulse_ms = 0
                        if injection:
                            self.engine.stimulate()
                        result = self.engine.observe(frame, self.neural_ms, video_reward=drive)
                        bins = result.pop("bins")
                        raster.extend(bins)
                        history.append({"sim_ms": result["sim_ms"], "pam11_hz": result["pam11_hz"]})
                        event = {**result, "received_at": received, "completed_at": time.time(), "scene": observed_scene, "visual_source": "fly_eye_camera" if self.recovery else "phone"}
                        log.write(json.dumps(event, allow_nan=False) + "\n")
                        atomic_json(self.run_dir / "latest.json", event)
                        from PIL import Image
                        Image.fromarray(frame).save(self.run_dir / "latest-input.png")
                        with self.condition:
                            self.state.update(telemetry=event, sequence=self.state["sequence"] + 1, history=list(history), raster=list(raster), message="Receiving screen pixels")
                        if time.monotonic() - last_save > 120:
                            self._save()
                            last_save = time.monotonic()
                    with self.condition:
                        self.state["busy"] = False
            self._save()
        except Exception as error:
            with self.condition:
                self.state.update(phase="error", busy=False, message=f"{type(error).__name__}: {error}")
            print(f"Brain error: {error}", flush=True)

    def stop(self):
        with self.condition:
            self.stopping = True
            self.condition.notify_all()
        self.thread.join()


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, experiment, **kwargs):
        self.experiment = experiment
        super().__init__(*args, directory=str(ROOT / "dist"), **kwargs)

    def log_message(self, *_):
        pass

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Cross-Origin-Resource-Policy", "same-origin")
        super().end_headers()

    def local_request(self):
        port = self.server.server_port
        allowed = {f"127.0.0.1:{port}", f"localhost:{port}"}
        host = self.headers.get("Host", "")
        origin = self.headers.get("Origin")
        return host in allowed and (origin is None or origin in {f"http://{h}" for h in allowed}) and self.headers.get("Sec-Fetch-Site") != "cross-site"

    def respond(self, code, data):
        body = json.dumps(data, allow_nan=False).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        if not self.local_request():
            return self.respond(403, {"error": "Local origin required"})
        path = urlsplit(self.path).path
        if path == "/api/status":
            return self.respond(200, self.experiment.snapshot())
        if path == "/api/session":
            return self.respond(200, {"token": self.experiment.token})
        if path.startswith("/api/"):
            return self.respond(404, {"error": "Unknown API endpoint"})
        return super().do_GET()

    def do_POST(self):
        if not self.local_request() or not secrets.compare_digest(self.headers.get("X-Fly-Token", ""), self.experiment.token):
            return self.respond(403, {"error": "Valid local session required"})
        try:
            length = int(self.headers.get("Content-Length", "-1"))
            if not 0 <= length <= FRAME_WIDTH * FRAME_HEIGHT * 4:
                return self.respond(413, {"error": "Invalid payload size"})
            self.connection.settimeout(10)
            body = self.rfile.read(length)
            if len(body) != length:
                raise ValueError("Truncated request")
            path = urlsplit(self.path).path
            if path == "/api/frame":
                if self.headers.get("Content-Type") != "application/octet-stream":
                    raise ValueError("Expected raw RGBA bytes")
                client = self.headers.get("X-Fly-Client", "")
                if not 1 <= len(client) <= 80:
                    raise ValueError("A client ID is required")
                recovery = None
                if self.headers.get("X-Fly-Experience") == "recovery":
                    attached = self.headers.get("X-Fly-Attached")
                    if attached not in {"true", "false"}:
                        raise ValueError("Attachment must be true or false")
                    recovery = {"scene": self.headers.get("X-Fly-Scene"), "attached": attached == "true"}
                self.experiment.submit(body, client, recovery=recovery)
                return self.respond(202, {"accepted": True})
            if path == "/api/control":
                data = json.loads(body)
                if not isinstance(data, dict) or set(data) != {"action"} or not isinstance(data["action"], str):
                    raise ValueError("Expected an action object")
                return self.respond(200, self.experiment.control(data["action"]))
            return self.respond(404, {"error": "Unknown API endpoint"})
        except (ValueError, TypeError, UnicodeError) as error:
            return self.respond(400, {"error": str(error)})
        except RuntimeError as error:
            return self.respond(409, {"error": str(error)})


def serve(args):
    run_dir = args.run_dir.resolve()
    run_dir.mkdir(parents=True, exist_ok=True)
    lock = (run_dir / "worker.lock").open("a")
    try:
        fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
    except BlockingIOError:
        raise SystemExit("This run directory is already in use by another brain process")
    experiment = Experiment(run_dir, neural_ms=args.neural_ms, fresh=args.fresh, frozen=args.frozen, video_reward=not args.no_video_reward, recovery=True)
    server = ThreadingHTTPServer(("127.0.0.1", args.port), partial(Handler, experiment=experiment))
    experiment.start()
    url = f"http://127.0.0.1:{server.server_port}"
    print(f"Fly Wirehead: {url}\nCtrl-C saves the brain and exits.", flush=True)
    if not args.no_browser:
        webbrowser.open(url)
    try:
        server.serve_forever(poll_interval=.2)
    except KeyboardInterrupt:
        print("Saving brain state…", flush=True)
    finally:
        server.server_close()
        experiment.stop()
        lock.close()

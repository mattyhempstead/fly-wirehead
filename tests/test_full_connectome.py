"""Opt-in integration checks on the real, checksum-locked 166,700-cell graph."""
import json
import os

import numpy as np
import pytest

pytestmark = pytest.mark.skipif(os.environ.get("FLYWIREHEAD_FULL_TEST") != "1", reason="Requires prepared MaleCNS data")


def test_pixels_reward_memory_and_checkpoint(tmp_path):
    from flywirehead.data import verify
    from flywirehead.engine import FlyEngine
    assert verify()["arrays_verified"]
    e = FlyEngine()
    b = e.brain
    assert b.n == 166700 and len(b.post) == 25582938
    assert len(b.retina) == 3335 and len(b.r8) == 811
    assert len(e.sample_cells) == 96 and len({c['id'] for c in e.sample_cells}) == 96
    white = np.full((160, 90, 3), 255, np.uint8)
    black = np.zeros_like(white)
    # Use the upstream assay's 1.5 s conditioning period before comparing rewards.
    for _ in range(3):
        e.observe(white, 500)
    checkpoint = tmp_path / "before.npz"
    b.checkpoint(checkpoint)
    baseline = b.weight[b.circuit["edges"]].copy()
    dark = e.observe(black, 100)
    b.restore(checkpoint)
    light = e.observe(white, 100)
    assert dark["input_sha256"] != light["input_sha256"]
    assert dark["spike_sha256"] != light["spike_sha256"]
    b.restore(checkpoint)
    control = e.observe(white, 200)
    control_weights = b.weight[b.circuit["edges"]].copy()
    b.restore(checkpoint)
    e.stimulate()
    reward = e.observe(white, 200)
    assert reward["stimulus_ms"] == 200 and reward["pending_stimulus_ms"] == 0
    assert reward["pam11_spikes"] > control["pam11_spikes"]
    assert reward["kc_spikes"] > 0 and reward["memory"]["changed_edges"] > 0
    assert not np.array_equal(b.weight[b.circuit["edges"]], control_weights)
    assert sum(sum(bin["counts"]) for bin in reward["bins"]) <= reward["total_spikes"]
    b.restore(checkpoint)
    watching = e.observe(white, 200, video_reward=True)
    assert watching["pam11_spikes"] > control["pam11_spikes"]
    assert watching["spike_sha256"] == reward["spike_sha256"]
    assert watching["video_stimulus_ms"] == 200 and watching["manual_stimulus_ms"] == 0
    assert watching["stimulus_current_mv"] == 20 and watching["pending_stimulus_ms"] == 0
    continued = e.observe(white, 50, video_reward=True)
    assert continued["video_stimulus_ms"] == 50 and continued["pam11_spikes"] > 0
    stopped = e.observe(white, 50, video_reward=False)
    assert stopped["stimulus_ms"] == 0 and stopped["stimulus_current_mv"] == 0
    assert np.all(b.drive[b.circuit["reward"]] == 0)
    b.restore(checkpoint)
    e.stimulate()
    overlap = e.observe(white, 200, video_reward=True)
    assert overlap["spike_sha256"] == watching["spike_sha256"], "Manual stimulation must not double the current"
    assert overlap["manual_stimulus_ms"] == overlap["video_stimulus_ms"] == overlap["stimulus_ms"] == 200
    b.restore(checkpoint)
    replay = e.observe(white, 200)
    assert replay["spike_sha256"] == control["spike_sha256"]
    b.restore(checkpoint)
    b.weights_frozen = True
    e.stimulate()
    frozen = e.observe(white, 200)
    assert frozen["pam11_spikes"] > 0
    assert np.array_equal(b.weight[b.circuit["edges"]], baseline)
    assert np.isfinite(b.weight).all()
    print(json.dumps({"neurons": b.n, "edges": len(b.post), "white_spikes": light["total_spikes"], "black_spikes": dark["total_spikes"], "control_pam11_spikes": control["pam11_spikes"], "stimulated_pam11_spikes": reward["pam11_spikes"], "watching_pam11_spikes": watching["pam11_spikes"], "watching_pam11_hz": watching["pam11_hz"], "watching_continued_pam11_spikes": continued["pam11_spikes"], "changed_synapses": reward["memory"]["changed_edges"], "checkpoint_replay_exact": True}, indent=2))


@pytest.mark.parametrize("video_reward,recovery", [(True, False), (False, False), (True, True)])
def test_real_model_http_transport_and_save(tmp_path, video_reward, recovery):
    import hashlib
    from functools import partial
    import threading
    import time
    from urllib.request import Request, urlopen
    from PIL import Image
    from flywirehead.server import Experiment, Handler, ThreadingHTTPServer
    from flywirehead.engine import decode_frame

    exp = Experiment(tmp_path, video_reward=video_reward, recovery=recovery)
    server = ThreadingHTTPServer(("127.0.0.1", 0), partial(Handler, experiment=exp))
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    exp.start()
    url = f"http://127.0.0.1:{server.server_port}"
    visual_scene, attached = "unplugged", True

    def request(path, body=None, content_type="application/json"):
        headers = {"X-Fly-Token": exp.token, "X-Fly-Client": "full-assay", "Content-Type": content_type}
        if recovery and path == "/api/frame":
            headers.update({"X-Fly-Experience": "recovery", "X-Fly-Scene": visual_scene, "X-Fly-Attached": str(attached).lower()})
        with urlopen(Request(url + path, body, headers=headers), timeout=10) as response:
            return json.load(response)

    def wait_for(predicate):
        until = time.monotonic() + 30
        while time.monotonic() < until:
            state = request("/api/status")
            assert state["phase"] != "error", state["message"]
            if predicate(state):
                return state
            time.sleep(.05)
        pytest.fail("Local neural worker did not finish")

    try:
        wait_for(lambda s: s["phase"] == "ready")
        rgba = np.full((160, 90, 4), 255, np.uint8)
        rgba[:80, :, 0] = 20
        expected = decode_frame(rgba.tobytes())
        request("/api/frame", rgba.tobytes(), "application/octet-stream")
        first = wait_for(lambda s: s["sequence"] >= 1 and not s["busy"])
        assert first["telemetry"]["input_sha256"] == hashlib.sha256(expected.tobytes()).hexdigest()
        assert np.array_equal(np.asarray(Image.open(tmp_path / "latest-input.png")), expected)
        assert first["telemetry"]["total_spikes"] > 0
        assert first["model"]["reward"]["video_enabled"] is video_reward
        assert first["telemetry"]["video_stimulus_ms"] == (50 if video_reward else 0)
        assert first["telemetry"]["manual_stimulus_ms"] == 0
        if recovery:
            assert first["telemetry"]["visual_source"] == "fly_eye_camera"
            assert first["telemetry"]["pam11_spikes"] > 0
            visual_scene, attached = "walking", False
            rgba[:, :, 1] = 40
            request("/api/frame", rgba.tobytes(), "application/octet-stream")
            detached = wait_for(lambda s: s["sequence"] >= 2 and not s["busy"])
            assert detached["telemetry"]["stimulus_ms"] == 0
            assert detached["telemetry"]["stimulus_current_mv"] == 0
            assert detached["telemetry"]["scene"] == "walking"
            assert detached["telemetry"]["input_sha256"] != first["telemetry"]["input_sha256"]
            assert not detached["stimulation_attached"]
            visual_scene, attached = "unplugged", True
            request("/api/frame", rgba.tobytes(), "application/octet-stream")
            replay = wait_for(lambda s: s["sequence"] >= 3 and not s["busy"])
            assert replay["telemetry"]["stimulus_ms"] == 0
            assert np.all(exp.engine.brain.drive[exp.engine.brain.circuit["reward"]] == 0)
            paused = request("/api/control", b'{"action":"pause"}')
            time.sleep(.15)
            assert request("/api/status")["sequence"] == paused["sequence"]
            request("/api/control", b'{"action":"save"}')
            saved = wait_for(lambda s: s["checkpoint"] and not s["busy"])
            assert saved["checkpoint"]["sim_ms"] == 150
            print(f"Recovery HTTP: attached PAM11={first['telemetry']['pam11_hz']:.2f} Hz; unplugged current=0; replay stays unplugged; eye-view pixels and checkpoint verified.")
            return
        time.sleep(.15)
        idle = request("/api/status")
        assert idle["sequence"] == first["sequence"]
        assert idle["telemetry"]["sim_ms"] == first["telemetry"]["sim_ms"], "Without fresh video, no further stimulation or neural time is delivered"
        request("/api/control", b'{"action":"stimulate"}')
        delivered = 0
        for i in range(4):
            request("/api/frame", rgba.tobytes(), "application/octet-stream")
            result = wait_for(lambda s: s["sequence"] >= i + 2 and not s["busy"])
            delivered += result["telemetry"]["manual_stimulus_ms"]
            assert result["telemetry"]["video_stimulus_ms"] == (50 if video_reward else 0)
        assert delivered == 200
        assert result["telemetry"]["pam11_spikes"] > 0
        paused = request("/api/control", b'{"action":"pause"}')
        time.sleep(.15)
        assert request("/api/status")["sequence"] == paused["sequence"]
        request("/api/control", b'{"action":"save"}')
        saved = wait_for(lambda s: s["checkpoint"] and not s["busy"])
        assert saved["checkpoint"]["sim_ms"] == 250
        assert (tmp_path / "brain.npz").stat().st_size > 0
        print(f"Real HTTP pipeline (video reward={video_reward}): pixels, automatic reward, idle gating, 200 ms manual pulse, pause and checkpoint verified.")
    finally:
        server.shutdown()
        server.server_close()
        thread.join()
        exp.stop()

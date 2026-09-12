import pytest
from flywirehead.server import Experiment
from flywirehead.engine import FRAME_HEIGHT, FRAME_WIDTH

PIXELS = bytes(FRAME_WIDTH * FRAME_HEIGHT * 4)


def test_detachment_is_owned_validated_and_irreversible(tmp_path):
    exp = Experiment(tmp_path, recovery=True)
    exp.state.update(phase="ready")
    with pytest.raises(ValueError):
        exp.submit(PIXELS, "one")
    with pytest.raises(ValueError):
        exp.submit(PIXELS, "one", recovery={"scene": "stairs", "attached": True})
    exp.submit(PIXELS, "one", recovery={"scene": "unplugged", "attached": True})
    assert exp.stimulation_attached
    with pytest.raises(RuntimeError):
        exp.submit(PIXELS, "two", recovery={"scene": "walking", "attached": False})
    assert exp.stimulation_attached, "An unowned window cannot detach the active experiment"
    exp.submit(PIXELS, "one", recovery={"scene": "walking", "attached": False})
    assert not exp.stimulation_attached
    exp.submit(PIXELS, "one", recovery={"scene": "unplugged", "attached": True})
    assert not exp.stimulation_attached, "Replaying the camera sequence cannot re-enable current"
    with pytest.raises(RuntimeError, match="disabled during recovery"):
        exp.control("stimulate")
    exp.control("pause")
    assert exp.pending is None
    exp.control("resume")
    assert not exp.snapshot()["stimulation_attached"]


def test_invalid_or_paused_frames_cannot_unplug_the_simulation(tmp_path):
    exp = Experiment(tmp_path, recovery=True)
    exp.state.update(phase="ready")
    with pytest.raises(ValueError):
        exp.submit(b"invalid", "one", recovery={"scene": "walking", "attached": False})
    assert exp.stimulation_attached
    exp.control("pause")
    with pytest.raises(RuntimeError):
        exp.submit(PIXELS, "one", recovery={"scene": "walking", "attached": False})
    assert exp.stimulation_attached

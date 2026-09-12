# How recovery works

[← README](../README.md)

## Visual observations

The recovery branch retains the checksum-locked MaleCNS v1.0 graph and the upstream inferred retinal projection. Three.js renders a separate perspective camera from the fly's head into a 90×160 RGBA target. The fly's own mesh is hidden for that capture; the active environment remains visible. This is an approximate shared eye camera, not a validated compound-eye optical model.

Python flips WebGL's bottom-up image and removes alpha. Luminance and colour drive 3,335 R1–R6 inputs and 811 R8 inputs. The C++17 kernel advances 50 ms per accepted observation by default, with 0.1 ms integration steps. The brain samples the visible environment more slowly than the presentation's wall clock.

The observer's camera cuts do not change the retinal camera. The HUD never enters the sensory image. Captures carry their scene and cable-attachment state with the exact pixels. A failed render, disconnected backend, pause, or hidden window prevents further observations. The worker waits without a frame; an in-flight sample can finish.

## Unplugging

Before 0.8 seconds of the opening presentation timeline (about 0.53 seconds at 1.5×), attached observations enable the existing 20 mV-equivalent drive to the 15 annotated PAM11 cells, unless `--no-video-reward` is set. Accepting the first detached recovery frame latches stimulation off for the remainder of that worker's lifetime. Later scene jumps, camera replay, pause/resume, and stale attached frames cannot turn it back on.

The recovery worker validates the scene, attachment state, frame size, local session, pause state, and ownership before accepting a frame. An exercise scene cannot request attached stimulation. Manual pulses are disabled in recovery; no old queued manual pulse is delivered. Telemetry retains the existing `stimulus_ms`, `stimulus_current_mv`, `video_stimulus_ms`, and `manual_stimulus_ms` fields for compatibility. The provenance explains that the historical video drive field now describes opening-cable stimulation. Each event also records `scene` and `visual_source: fly_eye_camera`.

Replay restarts presentation time only. Restarting the Python worker starts a new attachment lifecycle while restoring the saved neural state; use `--no-video-reward` to start wholly unstimulated.

## Measurements and movement

The graph displays the latest 120 measured mean PAM11 firing rates in Hz, using actual simulated timestamps and labelled automatic axis bounds. No synthetic signal, interpolation samples, dopamine concentration, or reward for completing a scene is supplied. Zero activity is shown as zero. The whole-network sample spike count stays alongside the graph. The numerical API retains the KC/motor rates and fixed 96-cell raster.

All five scenes use an 18-second choreography timeline played at 1.5×, for **12 seconds of playback**. The opening is a two-second front face close-up. Walking includes a timed stumble, loss of support in the bandaged arm, and recovery. Locomotion is anthropomorphic: the hind pair alternates support, the middle pair folds near the waist, and the front pair grips the rails, pumps while running, or rises in victory. The head counter-rotates to face forward and the wings tilt clear of the floor.

The treadmill belt and gait advance with the same presentation clock. Three climbing excerpts retain the full-size staircase with two edits through the journey; omitted travel also skips the corresponding rendered eye views. Animation is 1.5× faster, while neural integration and telemetry rates are unchanged. The staircase has 36 risers of 0.17 m, 0.32 m treads, and a 6 m width. The specimen is enlarged in a metre-scale environment. A white cloth wrap follows the anatomical front-right joint in every pose.

Two-bone inverse kinematics preserves leg segment lengths and bounds unreachable targets. The stair gait projects feet onto the stepped surface. The five-scene choreography controls travel, exercise gait, and the victory pose. Actual MN9/DNp09 rates modulate wing/body movement, while DNa02 right-minus-left rates modulate turning. These are artistic readouts; the brain has not learned the gait, climbed the staircase autonomously, or demonstrated recovery.

The existing experimental plasticity rule can modify 7,835 KC→MBON07/11 edges. It is neither a validated model of addiction nor evidence of useful learning or subjective experience. The underlying physiology remains approximate. No animals are involved.

## Local operation

`uv run flywirehead run` serves the recovery branch on loopback port 4173 and defaults to `runs/recovery`. This avoids overwriting the original feed's `runs/local`. Checkpoints preserve neural state and plastic weights. Each run directory has an exclusive worker lock. The API requires a local origin and ephemeral session token for mutations; one observation window supplies the stream at a time.

- `brain.npz`: saved neural state.
- `events.jsonl`: measured samples, scene identity, visual source, input hash, spike hash, and actual current delivery.
- `latest-input.png`: the RGB image supplied to the last neural sample.
- `latest.json`: that sample's telemetry.
- `provenance.json`: source locks, model, visual-source description, and stimulation policy.

Space pauses, arrows change scenes, R replays, C resets the camera, F enters fullscreen, and S requests a checkpoint. The optional `control_fly_recovery` WebMCP tool exposes those scene/brain actions. An always-visible **Play full sequence** button outside and below the chamber resets presentation time and resumes the brain to run all five scenes. It preserves the neural state and unplugging latch. The completed victory pose holds until replay is requested. Hidden tabs provide no new observations. Reduced-motion preferences begin paused and omit cyclic gait. Three.js is vendored; Google Fonts are optional with system fallbacks.

## Verification and sources

```sh
uv sync --extra test
uv run pytest -q
node --test tests/*.test.mjs
FLYWIREHEAD_FULL_TEST=1 uv run pytest -q -s tests/test_full_connectome.py
```

Full-network checks cover visual input, current injection and removal, frozen plasticity, exact checkpoint replay, real HTTP pixels, pause, and save. Recovery adds an irreversible-unplug check through the actual worker and verifies that camera replay supplies no further current. JavaScript checks cover the five scene boundaries, stumble timing, joint-length preservation, staircase dimensions, and metadata accompanying captured pixels.

The numerical backend is adapted from [nftechie/stonkfly](https://github.com/nftechie/stonkfly), commit `78ef3e05ab0fa086032098558d893667068944a0`, under MIT. Dataset attribution and pinned hashes are retained in [THIRD_PARTY.md](../THIRD_PARTY.md), [upstream.json](../flywirehead/upstream.json), and the neural lockfiles. The original feed implementation and its README are on the `main` branch.

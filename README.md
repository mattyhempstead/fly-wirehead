# Fly / Recovery

**Born to fly. Learning again.**

The `recovery` branch of [Fly / Wirehead](https://github.com/mattyhempstead/fly-wirehead/tree/main): the same faceted fly and real local connectome, now in a five-scene rehabilitation sequence. **166,700 neurons. 25.6 million connections. Live visual input and measured dopamine-neuron activity.**

A small white wrap stays around the front right leg's joint—the leg that used to swipe. The world uses metre-scale rehabilitation equipment and a real, 36-step outdoor staircase. The digital specimen is enlarged so its limbs and movements remain visible.

## The sequence

| Time | Scene |
| --- | --- |
| 0–10 s | **Unplugged.** Six seconds facing the fly's compound eyes, the cable lifting free, a bandage insert, then the observation room. |
| 10–24 s | **Learning to walk.** Parallel rails, hesitant steps, a buckling front leg and a near-fall, then another attempt. |
| 24–36 s | **Treadmill.** A regular treadmill, close-ups of the wrapped leg, and a progressively quicker gait. |
| 36–54 s | **The climb.** A full outdoor staircase, side tracking, a front view, and an overhead cut. |
| 54–64 s | **Victory.** Catching its breath, raising both front legs, and a camera arc above the upper landing. |

The final pose holds. The dopamine overlay stays visible through every cut. The sequence is a 3D simulation with choreographed rehabilitation and measured motor modulation, not a video or a claim that the network learned to walk.

## Run locally

Requires **Python 3.11+**, a **C++17 compiler**, and [uv](https://docs.astral.sh/uv/). Allow several GB of disk space; 16 GB RAM is recommended. The browser needs WebGL 2. This branch does not require downloading videos.

```sh
git clone --branch recovery https://github.com/mattyhempstead/fly-wirehead.git
cd fly-wirehead
uv sync
uv run flywirehead prepare
uv run flywirehead run
```

Open [localhost:4173](http://127.0.0.1:4173/). Keep the Python process running. On macOS, `run.command` also starts the app after setup. Install the compiler with `xcode-select --install` if needed.

The first preparation downloads and verifies about 1.1 GB of connectome data. The native kernel builds on first launch. Recovery defaults to **`runs/recovery`**, separate from the feed's `runs/local`. To continue an earlier fly, stop its worker and copy its `brain.npz` into an unused recovery run directory before starting. Otherwise the model starts from its normal initial state.

## What is actually simulated

A separate camera at the fly's eyes renders the current recovery world into **90×160 RGBA pixels**. The observer's camera cuts and the overlay are excluded. Those pixels stimulate the same **3,335 R1–R6 and 811 R8 inputs** in the retained MaleCNS graph. Each accepted observation advances 50 ms of neural time with 0.1 ms integration steps.

While the opening cable is attached, accepted frames can inject the original **20 mV-equivalent current into 15 PAM11 cells**. The first unplugged observation permanently disables that artificial drive for the worker. Manual pulses are disabled in recovery. Replaying the camera sequence does not reset the neural state or reconnect stimulation. An already-running sample can finish when unplugging or pausing.

The overlay shows **measured PAM11 firing in Hz**, not a dopamine concentration. Its labelled automatic scale follows the actual data; after artificial drive stops, the readings can be quiet or zero. No dramatic rises, reward for climbing, or recovery curve are added to the graph. Whole-network spike counts also remain live.

The numerical wiring is reconstructed; the physiology, visual projection, and plasticity are approximations. Walking, stumbling, treadmill running, and victory are staged poses. Measured motor and turning rates modulate wing motion, head movement, and body motion. This does not establish biological rehabilitation, pleasure, addiction, or consciousness. No living fly is involved.

## Controls

| Input | Action |
| --- | --- |
| Space | Pause / resume the sequence and new brain observations |
| Left / right or up / down | Previous / next scene |
| R | Replay the choreography without resetting the brain |
| Drag | Orbit the current camera shot |
| C / F | Reset the camera / fullscreen |
| S | Save the brain |

The **Play full sequence** button below the simulation starts all five scenes from the beginning, resuming if paused. It remains available to replay after the final scene. Camera cuts restore the planned framing. Reduced-motion preferences start the simulation paused and omit the cyclic gait; hidden tabs stop the presentation clock and new neural observations.

Checkpoints save periodically and on **Ctrl-C**. Measurements, input/spike hashes, and the latest eye-view image are stored under `runs/recovery`. Data, checkpoints, and local run logs are ignored by Git.

## Validation

```sh
uv sync --extra test
uv run pytest -q
node --test tests/*.test.mjs
FLYWIREHEAD_FULL_TEST=1 uv run pytest -q -s tests/test_full_connectome.py
```

See [model details](docs/model.md) and [validation results](docs/validation.md). The original feed remains on [`main`](https://github.com/mattyhempstead/fly-wirehead/tree/main).

## Credits

Adapted from [nftechie/stonkfly](https://github.com/nftechie/stonkfly), with the MIT notice preserved. Wiring comes from **MaleCNS v1.0** under **CC BY 4.0**. Three.js renders the scene; Python and C++17 run the brain. See [sources and licences](THIRD_PARTY.md).

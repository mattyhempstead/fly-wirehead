# Matrix model and operation

[Back to README](../README.md)

## Presentation and shared input

The `matrix` branch renders 64 flies and 64 phones in an 8 × 8 factory. There is one Python worker and one native connectome, not 64 neural simulations.

`prepare_matrix.py` decodes the twelve prepared MP4s into 144 × 256 frame sheets at 15 fps. Clip duration is bounded by the available decoded frames; the previously trimmed four-second clip cannot reveal later footage. These local WebP sheets are drawn into one 8 × 8 screen atlas. Each station has a deterministic independent timer, clip order, phase, and start offset. The timer advances with visible, unpaused presentation time. Phone slides and foreleg poses share the same 900 ms transition function.

Each fly receives a seeded Fisher–Yates shuffle of the complete collection. Duplicate cycles are rejected, including rotations of the same cycle, so the twelve-video collection produces 64 distinct loops. Each loop plays all twelve clips once before repeating; playback offsets and swipe timers remain independent. The seed keeps a fly's order stable across reloads.

The Three.js screen geometry maps each phone to its own atlas tile. Phones face along −X toward flies facing +X. Repeated bodies, wings, benches, swiping limbs, and wires use instancing; the entire screen atlas is rendered as one mesh. Observer camera controls do not affect the sensory image.

Each fly's anatomical back right leg (+Z, hind pair) carries a metal cuff aligned with the lower leg. Nineteen alternating metal links drape over the bench edge to an eyelet bolted to the factory floor. The cuff follows the fly's body transform; small movements taper through the upper links while the lower chain and anchor remain fixed. This is visual restraint choreography, not a chain physics solver. The original body proportions, compound eyes, antennae, and wing shape are retained, with finer body facets, bristles, and cross-veins.

The containment environment adds falling glyph columns on the rear walls, machine banks, cable bundles, tall power columns, green station lights, and slow floor mist. These decorative effects advance on the presentation clock and freeze with the floor. Emission varies slowly within a small range, with no abrupt flashing. The code, haze, lighting, vignette, and scanlines do not alter the phone atlas or the pixels sent to the shared brain. The phone footage remains in its original color.

For each observation, the browser copies one phone's currently composited tile into a 90 × 160 canvas, flips the RGBA rows into the native WebGL-compatible order, and submits it through the existing local bridge. Selection advances round-robin across all 64 stations. The brain therefore receives successive samples from different phones, not a simultaneous 64-image retinal field. There are no individual neural memories or feedback loops per station. The UI's current input station identifies the sampled display.

The browser submits nothing before the cache is ready, after rendering fails, while hidden, or while the floor is paused. An already accepted observation can finish. The visual floor can continue during brain loading or disconnection; actual measurements are then unavailable and displayed as a dash.

## Neural dynamics

The retained MaleCNS graph has 166,700 neurons and 25,582,938 directed connections. The inferred visual projection supplies 3,335 R1–R6 cells and 811 R8 cells from display luminance and color. Python calls the C++17 kernel through `ctypes`, integrating 50 ms per accepted observation in 0.1 ms steps by default.

Video-linked stimulation remains enabled by default: every accepted phone observation supplies 20 mV-equivalent current to the 15 annotated PAM11 cells. Use `--no-video-reward` with its own run directory for a control. The existing manual stimulus API remains available, although the factory UI does not expose a stimulus button or dopamine chart.

The experimental plasticity rule can modify 7,835 existing KC→MBON07/11 connections. The UI shows the real latest whole-network spike count. Measured MN9/DNp09 activity modulates wing flutter, with an independent presentation phase per fly. Swiping, idle movement, and clip selection remain choreographed. All 64 models share the same measurements. These mappings establish neither learned preference nor realistic physiology.

## Controls and persistence

The buttons below the scene select the factory, a row, or one station; pause the floor; and toggle fullscreen. Drag to orbit, scroll to zoom, Space to pause, C to change view, and F for fullscreen. Reduced-motion preferences start the floor paused and omit the swipe gesture and sliding transition.

Dragging grabs the scene in both axes and stops immediately on release. Sensitivity follows the canvas height and decreases in close views and at higher zoom. A drag interrupts a preset transition at the currently displayed pose; selecting another preset turns along the shortest arc and smoothly restores its zoom. The camera stays above the floor without flipping over.

The Play reveal button below the scene starts a 16-second camera sequence: a 1.4-second hold on the front-left fly, then a smooth pullback to the factory preset. Logarithmic scale interpolation and a span-dependent camera target keep the opening station in frame as the view widens. The sequence stops at the full grid and can be replayed or restarted. Pause holds its clock; dragging, scrolling, or choosing a preset cancels it at the displayed pose. Starting it resumes a paused floor, including when reduced-motion preferences initially paused playback. It runs only after an explicit button or WebMCP `reveal` action; it never autoplays.

`runs/matrix/brain.npz` retains neural state and plastic weights. It is independent of `runs/local` and `runs/recovery`. Checkpoints save every two active minutes, on a WebMCP save request, and on Ctrl-C. An explicitly supplied `--run-dir` overrides the default. `--fresh` starts over in that directory and will replace its checkpoint when saved.

`events.jsonl` contains actual measurements and image/spike hashes; `latest-input.png` holds the most recent phone pixels; `latest.json` contains the last result. One browser window owns sensory submission at a time. A second may take over after four seconds without input from the first. The HTTP server binds to loopback and validates local origins and session tokens.

## Validation

JavaScript checks cover the complete grid, independent timers, diversity of clip selection and swipe phases, uninterrupted playheads within turns, the four-second trim, shared phone/leg easing, pause, and native pixel orientation. Existing checks retain neural bridge behavior and measured-rate preservation. Browser checks exercise the actual factory renderer, all 64 feeds, shared live telemetry, camera controls, and pause/resume.

Full-network assays in `tests/test_full_connectome.py` validate black/white visual responses, stimulated/control trials, frozen plasticity, and exact checkpoint restoration. Matrix changes the presentation and input routing, not the neural equations or kernel.

## Sources

The backend derives from [nftechie/stonkfly](https://github.com/nftechie/stonkfly), commit `78ef3e05ab0fa086032098558d893667068944a0`, under MIT. See [THIRD_PARTY.md](../THIRD_PARTY.md) for MaleCNS CC BY 4.0 attribution and [flywirehead/upstream.json](../flywirehead/upstream.json) for source hashes. Prepared media metadata retains the twelve user-selected source links and creators.

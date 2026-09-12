# Fly / Matrix

**Born to fly. Wired to stay.**

An **8 × 8 factory floor of 64 flies**, each wired in from above and facing its own phone. Every phone has an independent clip order, playback position, and swipe timer. The front right leg moves with its phone's swipe.

This is the `matrix` branch of [Fly / Wirehead](https://github.com/mattyhempstead/fly-wirehead/tree/main). It uses the same faceted fly, real insect footage, and local Python/C++ connectome. **One shared brain serves the whole floor.** This branch is primarily a visual demonstration.

## The floor

- **64 stations:** aligned metal benches, overhead supply lines, station IDs, and a regular 8 × 8 layout. Each fly's back right leg has a metal cuff and linked chain running over the bench edge to a bolted floor anchor.
- **A containment chamber:** blackened metal, green pools of light, falling code on towering walls, rear machine banks and cable bundles, power columns, drifting floor haze, and subtle surveillance scanlines. Original fly colors and full-color insect footage remain visible against the dark environment.
- **64 independent feeds:** each fly has its own unique shuffled loop through all twelve insect Shorts, playing every clip once before repeating. Playback offsets and swipe timers are independent. Swipes occur roughly every 2.6–3.5 seconds, staggered across stations.
- **Head-on phones:** each portrait screen points directly toward its fly; the phone has no attached machinery.
- **One shared connectome:** the browser samples the phones in rotation, submitting one display per neural observation. Measured motor activity modulates wing movement across the floor.
- **Three camera views:** factory floor, along the line, and a single station. Drag to orbit, scroll to zoom, and use the buttons below the view to pause or enter fullscreen.
- **A camera reveal:** press **Play reveal** below the simulation for a 16-second shot that opens on one fly, then smoothly pulls back to all 64. Replay it whenever you like; dragging, scrolling, or choosing a view takes over the camera.

The demonstration uses twelve source videos with 64 independent playheads, rather than 64 unique source videos. The fourth-second limit on `PBWmPoLjVvA` is preserved. There is no video audio in this branch.

## Run locally

Requires **Python 3.11+**, a **C++17 compiler**, [uv](https://docs.astral.sh/uv/), **yt-dlp**, **FFmpeg**, and a browser with WebGL 2. Allow several GB of disk space; **16 GB RAM** is recommended.

```sh
git clone --branch matrix https://github.com/mattyhempstead/fly-wirehead.git
cd fly-wirehead
uv sync
uv run flywirehead prepare
uv run python scripts/download_videos.py
uv run python scripts/prepare_matrix.py
uv run flywirehead run
```

Open [localhost:4173](http://127.0.0.1:4173/). Keep Python running. **Ctrl-C** saves the brain and shuts down; the next launch restores it. This branch defaults to `runs/matrix`, separate from `runs/local` and `runs/recovery`.

`prepare_matrix.py` builds small portrait frame sheets from the existing MP4s. It decodes the actual footage at 15 frames per second, allowing all 64 phones to use independent playback positions without running 64 video decoders. One shared canvas carries the screens to Three.js; repeated geometry uses GPU instancing. The phone transitions and leg animations run separately at the display frame rate. Regenerate the cache after changing the playlist. Media, generated frame sheets, datasets, and checkpoints remain outside Git.

## The shared brain

The browser copies a phone's actual composited pixels, including a swipe in progress, to a **90 × 160 RGBA** image. Successive observations rotate through the 64 phones. Those pixels stimulate **3,335 R1–R6 and 811 R8 inputs** in the retained **166,700-neuron, 25.6-million-connection** graph.

Each accepted observation advances **50 ms of neural time** using **0.1 ms** integration steps. All visual flies share those measurements; they are not separate neural agents. The readout beneath the floor shows the real latest spike count. The visual floor can run while the brain loads or is offline; unavailable measurements display a dash. Hidden or paused playback supplies no new inputs.

The existing artificial PAM11 drive remains enabled: each accepted observation delivers 20 mV-equivalent current to the 15 annotated PAM11 cells. Use `--no-video-reward` for an unstimulated control. The dopamine graph is omitted from this demonstration.

Swiping, breathing, and clip selection are choreographed. The model uses reconstructed wiring and approximate dynamics; this does not establish learned preference, pleasure, addiction, or biological validity. No living fly is involved.

[Model and operation notes](docs/model.md) · [Validation](docs/validation.md)

## Controls

| Input | Action |
| --- | --- |
| View buttons / C | Factory, row, or single-station view |
| Play / Replay reveal | Start the close-up-to-factory animation; resumes a paused floor |
| Drag | Orbit |
| Scroll | Zoom |
| Pause button / Space | Pause or resume the floor, camera reveal, and neural input |
| Fullscreen button / F | Toggle fullscreen |

Optional WebMCP controls expose the same actions, a measured status snapshot, and a brain checkpoint action. Checkpoints also save every two active minutes and on shutdown.

## Check it

```sh
uv sync --extra test
uv run pytest -q
node --test tests/*.test.mjs
```

The full-connectome assays can be run after preparing the dataset:

```sh
FLYWIREHEAD_FULL_TEST=1 uv run pytest -q -s tests/test_full_connectome.py
```

## Credits

The neural backend is adapted from [nftechie/stonkfly](https://github.com/nftechie/stonkfly), with its MIT notice preserved. Wiring data comes from **MaleCNS v1.0** under **CC BY 4.0**. The factory uses **Three.js**. Video creators retain the rights to their footage; titles, creators, sources, and hashes are retained in the [video credits](dist/media/playlist.json).

See [sources and licenses](THIRD_PARTY.md) and [the pinned upstream revision](flywirehead/upstream.json).

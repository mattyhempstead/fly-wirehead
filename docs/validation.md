# Local model validation

Verified on 2026-09-10 with Python 3.12.11 and the committed dependency lock.

- MaleCNS source files and prepared graph arrays match the upstream SHA-256 locks: 166,700 neurons, 25,582,938 directed connections, 3,335 mapped R1–R6 inputs and 811 mapped R8 inputs.
- From the same checkpoint following 1.5 s of white-input conditioning, a 100 ms white observation produced **127,378 spikes**, versus **92,952** for black input.
- A 200 ms control observation produced **0 PAM11 spikes**; the matched stimulated observation produced **261 PAM11 spikes**. After stimulation, **3,087 plastic edges** differed from their original baseline, and the weight array differed from the unstimulated control. This is a mechanism check, not a claim of learned preference or biological validity.
- Frozen plasticity preserved the saved weights despite reward-cell spiking.
- Restoring the checkpoint and replaying the control input produced the exact same spike hash.
- A real local HTTP worker received RGBA pixels, saved the corresponding RGB image exactly, delivered the requested 200 ms pulse over four observations, stopped receiving observations when paused, and saved a checkpoint at 250 ms neural time.
- Four fast Python checks cover pixel orientation/shape and local API validation, ownership, pause, and stimulation controls. Two full-network integration checks cover the above model and transport behaviors. Nine JavaScript checks cover presentation timing and the backend bridge, including no fabricated telemetry on disconnect.

Commands are in the root README. Full-network tests are opt-in because they require the separately downloaded dataset. Source syntax, module references, UI targets, HTTP serving, raw pixel transport, and the full numerical backend were checked. The optional WebMCP tool was registered successfully in the browser; its actions have not been interactively tested.

## Rendering regression — 2026-09-11

The local browser console reproduced a startup failure: the first `requestAnimationFrame` timestamp could precede the `performance.now()` value recorded during setup, passing a negative time step to playback and stopping the loop before the first render. The presentation clock now initializes from the first animation frame and bounds subsequent time steps. Pixel submission waits for a successfully rendered scene, and a rendering exception suspends visual input and shows a visible error.

All nine JavaScript checks passed, including the startup timestamp regression, repeated timestamps/suspended-tab gaps, and withholding frame requests when rendering is unavailable. In the actual local browser, the fly, overhead cable, and angled video screen rendered successfully; the exposure clock advanced, automatic and manual short changes worked, camera switching worked, and neural telemetry continued updating. No new browser errors appeared after the fix. These were browser/presentation changes; the numerical model was unchanged.

## Downloaded insect playlist — 2026-09-11

Ten fly/insect videos were downloaded with yt-dlp and prepared as H.264/AAC MP4s with FFmpeg. FFprobe verified their codecs, dimensions, and durations; all ten were visually checked. The playlist totals 353 seconds and occupies about 25 MB. Source titles, creators, URLs, and prepared-file hashes are recorded in `dist/media/playlist.json`.

In the local browser, actual moving insect footage rendered on the 3D phone and advanced automatically from the first clip through the second and third. Manual next worked while paused, and resume restarted the selected video. The original-audio toggle switched on and off without playback errors. The browser reported no errors or warnings during these checks.

The backend's saved 90×160 `latest-input.png` showed the same insect footage and portrait composition as the phone. Pausing held neural time at 193.20 seconds and preserved the input and spike hashes across subsequent status checks. Resuming advanced both video time and neural time, with new input hashes and measured spikes. Failed, loading, stale, or paused media is gated from the sensory stream; there is no synthetic-video fallback.

All 13 JavaScript checks passed, covering the retained clock/bridge behavior plus local-media cycling, paused manual changes, full-frame aspect fitting, stale-frame rejection, and skipping failed media. The numerical backend was unchanged, so the full-network assays above were not repeated for this presentation change. WebMCP status, pause, next-short, and resume actions were exercised successfully.

## Portrait Shorts with three-second swipes — 2026-09-11

The landscape playlist was replaced with ten native portrait YouTube Shorts. FFprobe verified all downloaded sources at 720×1280 and every prepared file at 360×640 with square pixels. All ten were visually checked. The downloader rejects landscape sources, and the player accepts only the prepared 9:16 dimensions, drawing directly to the phone without blurred filler.

The feed now advances at three seconds of played media time and wraps after ten clips. All 14 JavaScript checks passed, including just-before/at-three-second boundaries, timer reset for the next clip, and pausing at the boundary without advancing until resumed. In the local browser, the phone displayed full-height footage, the eighth short was playing at 23 seconds of exposure, and neural measurements continued updating. No browser errors or warnings appeared. The numerical backend and visual-input transport were unchanged.

## User-selected five-video playlist — 2026-09-11

The active playlist now contains only `HOe8Ur6H8x4`, `rUmhjdFVPFo`, `lYrSza4cYaE`, `db5JqXQekmE`, and `PBWmPoLjVvA`, in that order. All five downloaded successfully, were visually inspected, and verified at 360×640. The final prepared MP4 contains only the first four seconds; FFprobe reports exactly 4.000000 seconds. The downloader records the trim and reproduces it on later runs, including when cached output has a different duration.

The refreshed local browser showed the five-clip playlist, the selected fly footage, three-second automatic swipes, and continuing neural telemetry without browser errors. Playback and neural code were unchanged; validation focused on playlist identity/order, dimensions, file hashes, the four-second media cut, and a successful repeat preparation from the download cache.

## Scene overlays and motor response — 2026-09-11

The display now uses one large chamber with a neural overlay, larger typography, and no visible playback controls or current-video label. The overlay displays the measured whole-network firing rate, sample spike count, zero-based network activity graph, and existing 96-cell raster. Its graph records only new measured samples; disconnection clears the readings. Keyboard and WebMCP actions remain available.

An audit of 300 recent local samples found a median **61,731 spikes per 50 ms neural sample**, equivalent to **1,234,620 network spikes per simulated second**. Motor firing was nonzero in 204 samples, with median 5 Hz and maximum 30 Hz. PAM11 was nonzero in only one sample. The old prominent PAM11 reading therefore did not represent overall network activity.

The animation now maps those measured motor rates through a bounded response with faster attack and slower release, amplifying wing, body, and leg movement; signed turning activity moves the head smoothly. The numerical engine, visual-input transport, and stimulation policy are unchanged. All 17 JavaScript checks passed, including low-rate response, bounds, smooth decay, pause, direction, and preserving the input measurements. Browser inspection verified the larger overlay, removed controls and video label, rendered fly and phone, and no new errors. Pausing held exposure at 00:01:44, neural time at 278.00 seconds, and the sample count at 62,232; resuming restarted playback.

## Synchronized foreleg swipe — 2026-09-11

The phone transition and front right leg now share one presentation timeline. All 22 JavaScript checks pass, including identical stroke/slide easing, automatic and manual advancement, holding during loading/pause/buffering/errors, and reduced-motion behavior. A sweep of 1,001 poses checks a fixed shoulder, constant segment lengths, finite coordinates, and continuous joint movement. This caught and corrected a joint-direction flip during development. The local browser rendered the raised foreleg during a manual skip while neural telemetry continued updating. The gesture changes presentation only; numerical dynamics and the three-second media cutoff remain unchanged.

## Automatic video-linked PAM11 drive — 2026-09-11

Each accepted playing-video observation now injects 20 mV-equivalent current into the 15 annotated PAM11 cells. The existing graph, visual projection, and numerical kernel are unchanged. From the same checkpoint and with the same 200 ms white input, the control produced **0 PAM11 spikes**, while automatic video stimulation produced **261 spikes (87 Hz per neuron)**. It exactly reproduced the existing manual pulse's spike hash. A further 50 ms video observation produced 70 PAM11 spikes without a queued manual pulse. Disabling video reward removed the injected current, and overlapping manual stimulation did not double it.

All **7 Python checks**, including the full-graph assays and real HTTP worker with automatic reward both enabled and disabled, passed. They verify received pixels, delivered current, waiting without frames, pause, manual pulses, and checkpoint restore. All **23 JavaScript checks** passed, including immediate observation gating on buffering and seeking.

The local app restarted from its saved state at 413.40 s neural time. Live insect footage produced **70 PAM11 spikes in 50 ms (93.33 Hz)** with automatic drive and no manual pulse. Pausing held sample sequence and neural time unchanged; resuming produced 66 PAM11 spikes (88 Hz) with video stimulation restored. A copy of the pre-change checkpoint is retained locally as `runs/local/brain-before-video-reward.npz`. These are numerical stimulation checks, not evidence of pleasure or learned preference.

## Live dopamine activity chart — 2026-09-11

The overlay now shows one full-width chart of measured PAM11 firing in Hz, with labeled bounds and an automatic detail scale. A live 120-sample window ranged from 84 to 97.33 Hz; browser inspection showed visible rises and falls and a changing current reading (90.7 then 86.7 Hz), with no browser errors or warnings. This is neuronal firing, not dopamine concentration.

All **27 JavaScript checks** passed. The four new chart checks cover preserving measured values and timestamps, honest zero/flat/missing data, duplicate samples and clock resets, and the rolling window without clipping extremes. The numerical model and stimulation policy are unchanged.

## Matrix factory — 2026-09-12

The `matrix` branch renders a complete 8 × 8 grid with 64 flies, 64 head-on phones, overhead wires, and independent swipes. All five selected source videos appeared concurrently with differing playback positions. A live snapshot recorded 13 stations at different points in their swipe gestures. The frame cache contains actual decoded portrait footage, including only the first four seconds of the trimmed clip. Geometry instancing and one shared screen texture kept the local preview at 60 fps, with 12 draw calls in the main render pass and approximately 233,000 triangles.

Browser inspection covered the factory, row, and close station views, visible foreleg gestures, and original fly geometry. Pause held presentation time at 3.5506 seconds across checks; resume advanced presentation time and the round-robin input station. The connected brain's neural time advanced from 581,950 to 582,600 ms after resume. Actual spike counts continued changing. No browser errors or warnings appeared. The default run directory is `runs/matrix`; the local run began from a copy of the original feed's checkpoint.

All **32 JavaScript checks** passed, including five new checks for complete grid coverage, independent clocks, clip diversity, continuous playheads, the four-second trim, matched phone/leg easing, pause, and native RGBA row orientation. The ordinary Python suite passed **4 checks**, with **3 opt-in full-connectome checks skipped**. Local HTTP tests required localhost socket permission. The numerical kernel and dynamics are unchanged; full-connectome assays were not repeated for the presentation changes.

## Rear-leg restraints — 2026-09-12

All 64 flies now have a cuff on the anatomical back right lower leg, an alternating-link chain over the bench edge, and a bolted anchor on the actual factory floor. Browser inspection in the close station view verified the attached cuff, visible links, clear bench edge, and floor attachment while feeds and shared neural telemetry continued. The local preview remained at 60 fps with 15 draw calls in the main pass and no console errors or warnings. Body/head facet detail, bristles, and wing cross-veins were increased while retaining the original proportions. All **32 JavaScript checks** passed. Neural behavior and feed timing are unchanged.

## Matrix containment atmosphere — 2026-09-12

The factory now has darker metal surfaces, localized green lighting, bright code falling down tall rear walls, machine banks and hanging cable bundles, power columns, soft floor mist, and a subtle surveillance vignette/scanline layer. Full-color phones, red compound eyes, detailed wings, and metal restraints are retained. The new environment is cosmetic and excluded from neural input; its animations share the paused presentation clock. Browser inspection of the full floor confirmed all 64 stations and restraints, connected neural telemetry, and 60 fps with approximately 492,000 triangles and 36 draw calls in the main pass. All **32 JavaScript checks** passed; neural dynamics and video scheduling are unchanged.

## Camera dragging — 2026-09-12

Corrected the reversed vertical drag and removed delayed camera motion after dragging. Direct input takes over at the displayed pose, including during a preset transition. Drag sensitivity now follows viewport height and decreases with closer framing; preset resets take the shortest angular path and interpolate zoom. Pointer capture handles release, cancellation, lost capture, and secondary touches; wheel input respects pixel, line, and page units.

All **39 JavaScript checks** passed. Seven new checks cover actual Three.js screen projection in both drag axes at five headings, stopping without drift, interrupted presets, viewport/zoom sensitivity, shortest turns, tilt/zoom limits, pointer lifecycle, and wheel units. In the live browser, a diagonal drag and its reverse restored the original factory angles, and the camera remained unchanged after release. A close-up drag at 1.34× zoom moved more gently; rendering held 60 fps with connected neural telemetry and no console warnings or errors. Neural code and feed scheduling were unchanged.

## Twelve Shorts and individual shuffled loops — 2026-09-12

Downloaded all seven additional user-selected Shorts with yt-dlp and prepared them at 360 × 640. The collection now contains twelve clips. Source IDs, hashes, portrait dimensions, and the original four-second trim were verified; all seven additions were visually inspected. The frame cache was rebuilt from the actual footage.

Each station now repeats its own complete shuffled sequence, replacing the previous forward/reverse order with different offsets. All 64 cycles are distinct, including after normalizing their starting positions. All **42 JavaScript checks** passed, including unique permutations, every clip appearing exactly once per cycle, repeating across loop boundaries, and small collections where 64 unique cycles are impossible. Existing playhead, pause, and phone/leg synchronization checks still pass.

The local browser showed all twelve source videos concurrently across 64 phones. A later snapshot showed changed clips on all 64 phones, connected shared neural input, and 60 fps, without console warnings or errors. Neural dynamics are unchanged.

## Consistent pad lighting — 2026-09-12

The fly pads now use their own matte Lambert material, with steady emissive fill and no camera-depth fog. This removes metallic highlights that changed with the viewing angle and keeps the darker views brighter while retaining real fly shadows. Browser inspection covered the factory overview, a lower side angle, and a close station view. The close view held 60 fps with connected neural telemetry and no console warnings or errors. This changes only the pad material and its rendering batch.

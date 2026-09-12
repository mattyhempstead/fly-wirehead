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

## Single-fly camera reveal — 2026-09-12

The new Play reveal button is outside the scene, in the existing toolbar. Its 16-second sequence holds on a close station for 1.4 seconds, then pulls back and recenters smoothly on the full 8 × 8 grid. Completion restores the factory preset and changes the button to Replay reveal; restarting begins at the same close-up. Pause holds the reveal clock, and direct camera input cancels the sequence at its displayed pose.

All **45 JavaScript checks** passed. New checks cover the opening hold, continuous widening, exact final framing without drift, pause/resume, deterministic restart, and cancellation through drag, zoom, and presets. The actual browser button produced the close-up and completed at the full grid, with the Replay label, 60 fps, and connected neural telemetry. Neural dynamics and independent video sequences are unchanged.

## Ten-thousand-room reveal — 2026-09-12

The detailed room now contains 96 stations in an 8 × 12 arrangement. Its occupied footprint is 44.8 × 45 scene units, making it approximately square. The 30-second reveal holds on one fly, reaches the room overview at 11 seconds, and continues outward to a 100 × 100 grid of separate blocks. The All blocks preset also opens the complete layout directly.

The distant layout represents 960,000 flies visually. Only the original 96 feeds and one shared brain run independently; additional rooms use an image captured from the actual scene, instanced walls, and simplified nearby fly/phone geometry. Detail is reduced and distant blocks are added as the camera widens. The full 10,000-block browser view used three draw calls and approximately 740,000 triangles at 60 fps. An intermediate reveal sample showed 1,681 blocks at 57 fps. Connected neural telemetry and original feed playback continued; no browser errors or warnings appeared.

All **49 JavaScript checks** passed, including square room dimensions, 96 unique video cycles, exact block coverage and spacing, bounded distance rendering, both reveal stages, deterministic restart, and final Three.js camera projection across portrait and landscape aspect ratios. The numerical model and sensory transport are unchanged.

## Central fly opening — 2026-09-12

The reveal and Single station preset now target G5, one of the four central stations in the original room. That room already occupies one of the four central positions in the 100 × 100 block grid. The opening camera approaches from the opposite side of the overhead rail, with a modest downward angle. Browser inspection of the paused opening confirmed the fly's body, head, wings, and legs are visible without a neighbouring fly or supply rail crossing them. The phone remains in frame. Replay resumed successfully, and the browser reported no errors or warnings.

All **49 JavaScript checks** passed with the central opening pose used in the complete reveal check. This changes camera selection and framing only; video timing, neural input, and distant room rendering are unchanged.

## Continuous pullback and lower camera — 2026-09-12

Removed the two separately eased zoom stages, which brought the camera to a stop at the room overview. After the retained opening hold, one logarithmic trajectory now maintains constant proportional speed through the room and block scales, with smooth acceleration and deceleration only at its ends. Camera elevation stays about 27° above horizontal. The opening azimuth was adjusted to keep the central fly clear at this lower elevation, and the final span was tightened to retain useful framing.

All **49 JavaScript checks** passed. The reveal regression now measures proportional speed from seconds 4–27, including the former handoff, and verifies that it remains positive and constant. It also checks the retained low elevation, exact ending, and full-grid projection on portrait and landscape screens. Browser inspection covered the opening, an intermediate 121-block view, and the completed 10,000-block view. Both wider samples held 60 fps; the final view used three draw calls. Shared neural telemetry remained connected, with no browser errors or warnings.

## Horizontal supply wiring — 2026-09-12

Replaced the tall head connectors, thick transverse crossbars, and upright rail supports with short vertical head wires feeding eight thin horizontal runs. The runs meet a horizontal collector at the rear racks. Junction lights moved with the wiring, and the animated head connection remains vertical as the fly moves.

Browser inspection confirmed the unobstructed central fly and visible rise-to-horizontal junction in the opening close-up, the full room layout, and successful completion of the large reveal. The full-grid view retained 60 fps and three draw calls with connected neural telemetry and no browser errors or warnings. Both edited JavaScript modules passed syntax checks, and the diff passed whitespace checks. This is a geometry and lighting change; camera timing, video playback, and numerical simulation are unchanged.

## Pan controls — 2026-09-12

Added an external camera toolbar with Orbit/Pan drag modes, four directional buttons, and Recenter. Shift-drag pans from either mode; arrow keys pan when the scene is focused. Panning translates in the camera's screen plane without rotating or zooming, cancels an active reveal at its current pose, and remains available while paused. Recenter restores the pre-pan target while retaining angle and zoom. Room culling accounts for vertical panning.

All **53 JavaScript checks** passed, including actual Three.js pixel projection across camera headings, tilts, close/room/campus spans, zoom levels, and portrait/landscape viewports. Additional checks cover pan takeover without drift, recentering, preset reset, Shift-drag and selected Pan mode, pointer release, and room coverage after vertical panning. The browser verified arrow buttons, drag-to-pan, unchanged angles/zoom, paused panning, and exact recentering. Rendering held 60 fps, shared telemetry remained connected, and no console errors or warnings appeared. The preview was left running with Pan selected.

## Saved opening, 16:9 framing, and removed labels — 2026-09-12

Captured the user's live camera settings before editing: theta −0.5831104771, phi 0.9205223878, and target [2.1668115332, 1.7721133003, 1.9304575839]. The reveal and Single station preset now restore this exact angle and pan. The visible vertical span of 3.1926130203 is preserved in the wider frame. The opening was visually compared with the supplied screenshot and verified through live camera status.

The canvas now has a fixed 16:9 aspect ratio, with fullscreen letterboxing rules, and the station/block labels and their update code are removed. The normal browser view measured 1131.5 × 636.46875 CSS pixels: exactly 16:9, with zero remaining overlay label elements. The complete reveal finished at all 10,000 blocks, 60 fps, and three draw calls, with connected telemetry and no browser errors or warnings.

All **53 JavaScript checks** passed. The reveal check now verifies restoration of the saved angle and pan on replay, while retaining continuous proportional zoom and exact final framing. Neural dynamics and media playback are unchanged.

## Lower walls and nested grid reveal — 2026-09-12

Lowered detailed and repeated room walls from 20 to 6 units, with matching code panels and shorter background machinery. Neighbouring rooms now fade in across spans 28–110 instead of 65–95. The layout contains 100 rooms per block in a 10 × 10 arrangement, repeated across a second 10 × 10 grid. Low outlined plinths and wider service roads distinguish the two levels. The first block is fully visible before other blocks begin their separate fade across spans 900–1800. The 30-second camera path retains constant proportional speed through both reveals and the saved opening angle and pan. A new external 100 rooms button opens the intermediate view.

All **54 JavaScript checks** passed. Coverage includes unique coverage of all 10,000 rooms, each block's 100-room layout and boundaries, the central room's placement, bounded visibility after panning, gradual opacity changes, the order of both grid reveals, continuous pullback speed, exact completion and restart, and full-campus projection across portrait and landscape aspect ratios.

Browser inspection covered the saved single-fly opening, shorter walls and partially faded neighbouring rooms, the complete first block, an intermediate view spanning multiple blocks, and the completed animation. The 100-room view used four draw calls at 60 fps; all 10,000 rooms across 100 blocks used seven draw calls and 746,002 triangles at 60 fps. Shared neural telemetry remained connected, pause/resume worked during the reveal, and there were no console errors or warnings. The scene retains its clean 16:9 frame. Neural dynamics and independent media timing are unchanged.

## Keep the original room detailed during the pullback — 2026-09-12

Moved the original room's geometry replacement from span 180 to span 4,000. Its animated flies, phones, walls, and wiring now remain intact through the 100-room view and most of the outer-block reveal; the distant copy takes over only near the end. Browser status confirmed one detailed room at span 800, with 41 draw calls and 60 fps, and zero detailed rooms at the completed span 8,500, with seven draw calls and 60 fps. Shared telemetry stayed connected and there were no console errors or warnings. All six layout/reveal checks passed; the diff passed whitespace checks.

## Tighter outer grid without a fade — 2026-09-12

Reduced block spacing from 800 to 750 units, leaving 16-unit gaps instead of 66. The final camera span is 8,000 to fit the smaller footprint. The outer grid switches directly from hidden to fully opaque at span 900; the inner room fade and delayed original-room detail replacement are retained. All six layout/reveal checks passed, including the exact opacity boundary, absence of partially faded outer blocks, unique non-overlapping placement, continuous camera motion, and final framing. Browser inspection confirmed the denser full grid and no console errors or warnings.

## Reveal existing blocks through camera framing — 2026-09-12

Removed the span-900 visibility switch. Outer blocks are now fully opaque from the start and available independently of the original block's room fade. Expanded the drawing neighbourhood beyond the frame, accounting for low camera angles, wall height, and larger block plinths, so additional instances enter the draw before they enter view.

All **55 JavaScript checks** passed. A new Three.js frustum regression checks room and block bounds against a frame padded by 10%, including outer rooms below the old cutoff, close panned views, low viewing angles, and portrait/landscape frames. Browser inspection at span 800 confirmed surrounding blocks already present around the central block, with 1,521 submitted rooms, one detailed room, and 60 fps. The completed reveal retained 10,000 rooms, seven draw calls, and 60 fps. Shared telemetry stayed connected and there were no console errors or warnings.

## Original room wall trim — 2026-09-12

Added the missing continuous green strips along both original room wall tops, matching the distant shells' dimensions, height, color, and unlit, fog-free material. Browser inspection confirmed the complete outline above the original room's machinery, with no console errors or warnings. The edited module passed its syntax check and the diff passed whitespace checks. The preview was left paused, matching its state before the update.

## Remove wall symbols — 2026-09-12

Removed both falling-symbol wall planes, their canvas texture, and the glyph animation loop. The green wall trim, machinery, lighting, and mist remain. Browser inspection confirmed clear walls and connected neural telemetry with no console errors or warnings. The edited module passed its syntax check and the diff passed whitespace checks.

## Stronger wingbeats — 2026-09-12

Increased the detailed flies' wingbeat speed by about 1.8× and raised their angular amplitude from 0.025–0.165 to 0.075–0.355 radians. All 96 detailed flies retain their individual phases and measured motor modulation. The local close-up was inspected across changing poses with connected telemetry and no console errors or warnings. The edited module passed its syntax check and the diff passed whitespace checks. Neural dynamics, video timing, and the distant rendering tiers are unchanged.

## Remove room machinery — 2026-09-12

Removed the rear computer racks, cylindrical power columns, and their attached lights and cable bundles. The refreshed room snapshots also omit these objects in distant copies. Browser inspection confirmed open room edges, retained flies and phones, green wall trim, and connected neural telemetry with no console errors or warnings. Both edited JavaScript modules passed syntax checks and the diff passed whitespace checks. Restarted the stopped local Python server before verifying the preview.

## Consistent room floor shading — 2026-09-12

Separated the original room's two floor slabs from the metallic environment material. They now use diffuse Lambert shading without camera-depth fog, retaining received shadows while matching the lighting captured in the repeated rooms' overhead texture. Removed random instance tint from the copied floors; wall-shell variation remains.

Both edited JavaScript modules passed syntax checks and the diff passed whitespace checks. The local preview returned HTTP 200. This change was checked in source, without a new browser visual comparison.

## Recognizable animated flies in nearby rooms — 2026-09-13

Replaced the simplified static blobs and rectangular wings with a 670-triangle fly, compared with 3,222 triangles for the detailed model. The lightweight version keeps the original proportions, faceted red eyes, antennae, six jointed legs, head socket, and swept wings with veins. Up to 7,680 neighbouring flies render through two instanced draws. Wing vertices and normals rotate on the GPU around their own shoulder pivots; each room/station pair has its own phase, frequency, and amplitude. The original flies use the same independent rhythm scheme. The nearby tier now fades across spans 450–750, retaining models longer before the existing distant snapshots take over.

Also fixed neighbouring rooms disappearing when zooming in after a pan. Their fade now accounts for the camera target projected onto the floor, preserving the original reveal while allowing close inspection of adjacent rooms.

All **59 JavaScript checks** passed. New coverage verifies the polygon budget, original body bounds, wing-pivot attributes, varied wing cycles across 81 rooms, bounded instance counts without per-frame transform uploads, and visibility after horizontal or vertical panning. Browser inspection confirmed the neighbouring models, varied wing positions, and connected shared neural telemetry. A close panned view submitted 4,608 animated replicas and 4.32 million triangles at 60 fps. The completed reveal retained all 10,000 rooms, seven draw calls, 746,002 triangles, and 60 fps. There were no browser errors or warnings.

## Wider gaps between the largest blocks — 2026-09-13

Increased the spacing of the 100-room blocks from 750 to 830 units, widening the roads between their 734-unit plinths from 16 to 96 units. The final camera span increases to 8,800 to frame the expanded grid; room spacing within each block remains 70 units.

All eight layout and reveal checks passed, including continuous camera motion, early geometry submission, and complete campus framing across viewport shapes. Browser inspection confirmed the wider block gaps, 10,000 rendered rooms, seven draw calls, and no console errors or warnings. The preview was left paused in the All blocks view.

## Remove spare lines behind the central grid — 2026-09-13

Removed the rear wall's thin segmented light strips and vertical ribs. Moved the horizontal wiring collector from the former machinery bay to the last station row, shortening the eight supply runs so they no longer extend across the empty space behind the flies. The continuous green wall-top trim and fly head connections remain.

The scene module passed its syntax check and the diff passed whitespace checks. Restarted the stopped local server, then verified the cleared rear area in the browser with no console errors or warnings. The preview was left paused in the Factory floor view, with the shared brain connected.

## Match the original room's wall colors — 2026-09-13

Moved the original wall faces out of the metallic environment material into the same unlit, fog-free material as the repeated wall shells. Their dimensions and green colors now match, and random shell tinting is removed. The original walls share the neighbouring rooms' reveal opacity; overhead snapshots temporarily capture the walls at full opacity so the fade is applied only once.

Both edited JavaScript modules passed syntax checks and the diff passed whitespace checks. Browser comparison in the Factory floor view confirmed matching green walls and trim with no console errors or warnings.

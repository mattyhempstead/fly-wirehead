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

## Recovery branch — 2026-09-12

The 64-second sequence has five scenes: unplugging with a six-second front face close-up, walking with a stumble and rail catch, a treadmill, 36 human-sized stairs, and a victory pose on the upper landing. The original fly geometry is retained, with a white wrap that follows its front-right joint. Camera framing leaves the specimen clear of the persistent measured-neural overlay. Browser checks covered the face, visible bandage, stumble, treadmill, full staircase, summit, scene changes, pause/resume, and replay; no browser errors or warnings appeared.

The recovery process started from a separate copy of the feed's saved brain under `runs/recovery`, leaving `runs/local` intact. Live logs recorded eye-camera input from all five environments. The first attached observation measured **92 Hz PAM11 firing** with **50 ms of delivered current**. After unplugging, current was zero and the measured PAM11 rate settled at zero, while whole-network spikes and eye-view image hashes continued changing. The saved retinal image visibly showed the actual staircase. Replay does not reconnect artificial stimulation or reset the neural state.

All **32 JavaScript checks** passed, including scene boundaries, detachment timing, stumble progression, bounded leg geometry, full-size stair dimensions, and scene metadata accompanying the captured pixels. All **10 Python checks** passed, including full-connectome visual/reward assays and real localhost workers. The recovery HTTP assay measured **80 Hz PAM11 firing while attached**, verified zero injected current after unplugging and after camera replay, and saved an exact **150 ms** neural checkpoint. Ownership and invalid/paused frames were checked before irreversible detachment. The original assay still produced 127,378 white-input spikes versus 92,952 black-input spikes and exact replay after checkpoint restore.

These checks establish the numerical and presentation mechanisms. Rehabilitation travel, gait, and victory remain choreographed; measured motor and turning rates add movement modulation. The sequence is not evidence of learned locomotion or biological recovery.

## Recovery camera and motion polish — 2026-09-12

Observer framing is wider, with a front face close-up that gradually pulls back, longer tracking moves, and 550 ms dissolves between rooms. The stair camera flows continuously into victory. Dissolves copy the tone-mapped observer framebuffer and are excluded from eye-camera capture. The live neural activity panel is the only in-view overlay; playback, status, and errors sit below the scene.

Walking and treadmill cadence now use integrated speed ramps, wing phase accumulates continuously, and stair foot targets stay planted during stance and cross step edges during their airborne phase. All **35 JavaScript checks** passed, including speed/phase continuity, continuous stair footfalls, uninterrupted camera paths, and the matched stair-to-victory camera boundary. Browser checks covered wider framing, the bandage, rail visibility, scene transitions, the external replay button, and continuing measured telemetry without console errors. Numerical engine and stimulation behavior were unchanged; full-network assays were not repeated for these presentation changes.


## Shorter recovery edit — 2026-09-12

The sequence now runs for **33 seconds** with all five scenes retained. The opening remains a front face close-up; walking retains the stumble, and victory still raises both front legs. The climb uses three excerpts of the original 18-second motion, with two 320 ms dissolves; its source motion clock advances at one second per second between those edits. Treadmill footage uses the later part of the original cadence ramp.

All **36 JavaScript checks** passed. The added check verifies the 33-second duration, exactly two climbing edits, and unchanged climbing speed within each excerpt. Camera continuity checks exclude only those explicit edits and retain the continuous climb-to-victory boundary. The replay duration label derives from the same scene timeline.

## Upright gait and faster playback — 2026-09-12

The choreography is now 18 seconds played at **1.5×**, completing in **12 seconds**. All five scenes remain, with a two-second front close-up, the rail stumble, treadmill, three stair excerpts, and victory. The opening cable lifts after 0.8 timeline seconds. Dissolves last 200 ms.

The fly stands and steps on its hind pair. Its middle pair folds at the waist, and the front pair grips the rails, pumps during running, and raises in victory. The head counter-rotates toward the direction of travel and the wings tilt clear of the floor; the existing joint wrap follows the right arm. Browser inspection checked the upright rail and treadmill poses, both raised arms in victory, and the updated duration label. The full replay reached victory at 12 seconds with 1.5× playback, live measured neural activity, and no console errors or warnings.

All **38 JavaScript checks** passed. New checks cover alternating foot support without an airborne gap, foot-target continuity, 12-second playback at 1.5×, pause, and preservation of measured rates. Backend neural integration and telemetry were unchanged.

## Running-arm cleanup — 2026-09-12

Running arms now rotate forward and back from their shoulders with a steady elbow bend, opposite the same-side foot. This replaces the short hand targets that caused the generic leg IK to push the elbows sideways. Wrists follow their forearms, the middle pair folds close to the torso, and the bandage aligns with the upper arm. Arm movement settles before the victory raise. The 1.5× playback rate and 12-second montage are unchanged.

All **40 JavaScript checks** passed. The two new checks sweep complete strides and the victory transition, verifying fixed shoulders, preserved segment lengths, restrained lateral movement, bent elbows, aligned wrists, opposing swings, and continuity. The updated treadmill pose was checked in the local browser.

## Flexible elbow bandage — 2026-09-12

The rigid cuff is replaced by two tapered gauze sleeves joined over a rounded elbow pad. Each sleeve follows its own arm segment, so the white wrap bends around the actual joint in every pose. The close-up and running elbow were checked in the browser. All **40 JavaScript checks** pass; arm movement, playback, and neural behavior are unchanged.

## Lower observer cameras and delayed bandage — 2026-09-12

Observer cameras now sit closer to eye level with a gentle downward angle; the final victory orbit stays low. The bandage is hidden throughout the opening and appears from walking onward, with visibility reset on replay. Browser inspection checked the opening, rails, treadmill, staircase, and final victory framing. A full replay reached victory at 12 seconds with connected neural telemetry and no browser errors or warnings. All **40 JavaScript checks** passed, including camera continuity. The eye camera, choreography, and neural dynamics are unchanged.

## Continuous stair pan — 2026-09-12

The climb now shows one continuous five-second choreography excerpt ending at the summit, followed by victory. Internal travel jumps and stair dissolves are removed. A low camera pan tracks the fly from behind its side toward the front, matching the victory camera at the boundary. The montage remains 12 seconds at 1.5× speed. All **40 JavaScript checks** passed; the updated checks require uninterrupted stair motion, a single climbing shot, and continuous camera paths without exemptions for cuts. Browser inspection checked the stair framing and running pose. Neural dynamics and measured telemetry are unchanged.

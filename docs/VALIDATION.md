# Prototype validation

Validated on 30 September 2026.

## Automated

- 85 tests pass using Node's test runner.
- Exposure math: doubling ISO, exposure time, or aperture area changes exposure by the expected stop.
- Filters: ND64 attenuates six stops; prototype CPL attenuates one stop.
- All thirteen suggested camera setups pass their assignment's lesson assessment with valid framing.
- Missing filters, inappropriate motion settings, absent tripod, poor framing, obstruction, and unusable exposure prevent completion.
- World integration: every assignment viewpoint is walkable, its subject exists, and its subject is unobstructed from that viewpoint.
- Lake and boundary restrictions work while the pier stays walkable.
- Flash tests cover inverse-square distance falloff, power/aperture/ISO/filter response, shutter-independent pulse exposure within sync, suppression beyond sync, and a lit close portrait with dark ambient exposure.
- Studio tests cover continuous-light metering, moving and aiming the actual lights, colour and power, disabling lights, and migration of old/malformed lighting saves.
- Controls tests cover both shortcut directions, exposure effects, clamped limits, tripod stability/locking, reversal during setup, and instant setup/packing.
- Strict TypeScript check and Vite production build pass. The renderer makes the main bundle larger than Vite's default 500 kB warning threshold (about 165 kB compressed); no build error.

## Browser playtesting

- Actual rendered world and photo review inspected in the Codex in-app browser on macOS.
- All twelve assignments captured and assessed successfully from their travel viewpoint with suggested settings.
- A blocked waterfall viewpoint was discovered, fixed in scenery and viewpoint layout, and covered by a world integration test.
- Removing the ND filter from a half-second creek exposure produces six stops of overexposure, explains the problem, and fails the assignment.
- Journal and mission progress survive a reload; XP is derived from completed mission IDs and cannot be farmed by repeating a mission.
- Desktop and narrow photo-review layouts inspected; long reviews scroll within the dialog.
- Fresh-notebook backup and restoration verified through the UI; restoring recovers journal and completion data.
- No browser console errors or warnings observed during the initial capture test.
- Lighting playtests use a separate `?playtest=1` save so the player notebook is preserved.
- A 1/4-power close flash portrait passes with approximately −6 EV ambient and −0.4 EV subject exposure. Switching from 1/250 to 1/125 increases ambient exposure by one stop while the subject reading stays near −0.4 EV.
- At 1/500, flash is suppressed, the subject is dark, and the review explains the sync limit. Returning to 1/250 restores the lit portrait.
- Studio power, angle, distance, height, and colour controls operate through the UI; lighting settings survive reload. The actual studio lamps, illuminated subjects, and shadows were visually inspected.

## Minimal UI and keyboard pass

- Full-screen HUD inspected at the default 1280 × 720 viewport and at 480 × 740; controls stay inside the viewport with no horizontal overflow.
- Esc opens the pause menu. Assignments, journal, map, and controls are accessed there; Esc or Close from any submenu or message resumes directly.
- Numeric shortcuts change shutter, aperture, and ISO in the UI. Native input controls retain their keyboard behavior while focused.
- T starts the visible first-person deployment, marks the tripod busy, and disables capture. When ready, it shows “Pack tripod” and re-enables capture; packing returns it to “Deploy tripod”.
- Capture saves with a thumbnail and no automatic dialog. Clicking the preview opens feedback; captured settings include the deployed tripod.
- The first-person model renders in a separate scene and is excluded from photo capture. Reduced-motion setup uses the instant transition path, covered by a state test.
- No browser console errors observed in this pass. Browser tests used the isolated playtest notebook.
- Screenshot: `docs/minimal-ui.png`.

## Sky and world clock

- Clock tests verify a full 24-hour cycle in 1,800 seconds, midnight wrapping, normalization of saved time and meditation targets, and safe handling of invalid frame times.
- Sky tests verify east-to-west sun movement, twilight warmth, bounded cloud cover, continuous light/weather across midnight and twilight, and brighter outdoor metering during the day.
- Time-window tests include both interval endpoints and windows crossing midnight. A correctly framed, exposed, technically valid photograph fails a timed brief outside its required window.
- All thirteen suggested camera setups pass at their preferred time with the runtime time context supplied.
- World integration tests inspect actual sun/moon positions and intensities, sky colour, fading stars, and changes to the 60 cloud instance matrices.
- Browser: meditation transitions to 23:00, blocks capture during the transition, and resumes without a modal. Stars and dark cloud silhouettes appear over the lake.
- Browser: selecting an astro assignment preserves the current clock; its night capture passes at 100/100 and records the time and cloud cover. Skipping to daylight produces exposure and time-window failures with meditation guidance.
- Browser: the world clock survives a reload and stays fixed while the pause menu is open. “For this assignment” skips back to golden-hour light and the lighthouse capture completes at 100/100.
- Preview screenshots: `docs/daylight.png`, `docs/minimal-ui.png` (golden hour), and `docs/night.png`.
- Browser: no console errors observed during these captures. All testing uses the isolated playtest notebook.

## Mission payments and purchasable gear

- Eleven economy tests cover one-time payments, failed/repeat attempts, duplicate mission IDs, affordability, immutable purchases, invalid gear IDs, save normalization, legacy back pay/flash, sufficient early rewards, actual focal range/crop math, burst ownership/preferences, 200 ms sequencing, cancellation, and one payment across three passing frames.
- Browser tests used the separate named `?playtest=gear-progression` notebook. A fresh wallet starts at $0, unavailable purchases are disabled, and using a locked flash opens the shop. Flash power remains disabled until owned; studio lights remain available.
- The golden-hour assignment paid $120 and bought the zoom lens. Creek, studio, and astro briefs paid $180, $140, and $200; buying the $360 burst camera left $160.
- A sports burst saved three separately indexed frames at 100/100 and paid $160 once. Buying the $180 flash left $140 against $800 earned and $660 spent. B changed to single-shot capture, added exactly one journal entry, and repeating the sports brief left the wallet at $140.
- Zoom keyboard controls changed the focal-length display in both directions. F toggled purchased flash; B and the shop toggle changed burst mode. Photo review retained focal length and burst index; the journal labels each burst frame.
- Reload restored all purchases, burst preference, wallet, focal length, and nine journal frames. The older playtest notebook received $460 in back pay and preserved its previously used flash for free.
- Shop inspected at 1280 × 720 and 480 × 740. The narrow dialog scrolls vertically without horizontal overflow. No browser console errors observed. Temporary test tabs were closed and the viewport override reset.
- Verified preview: `docs/gear-shop.png`.

## Terrain, mission discovery and wildlife

- Fresh notebooks expose exactly one mission. Discovery is limited to the stories offered by a local, is idempotent, and survives serialization. Legacy evidence retains previous briefs without revealing the entire board.
- All six locals are on walkable ground and are detected within interaction range, with elevation included. Their combined offers cover every nonstarter brief.
- Sampled points along each trail are walkable and have gradual height changes. The original town is level, the ridge rises over 18 m, and both lake and wetland prevent walking through water. One eastern trail originally clipped the pond and was rerouted onto dry ground.
- Every mission viewpoint is tested at actual terrain height; terrain is included in photo obstruction raycasts.
- Wildlife progression tests cover affordability, purchase persistence, separate equipped-lens ranges, invalid/unowned lens requests, gear/discovery acceptance rules, and good versus insufficient zoom, slow shutter, too-close/too-distant and obscured bird frames.
- Browser: an isolated fresh notebook showed one lighthouse brief and $0. Approaching Mara showed the talk prompt; talking revealed the creek and bird briefs. Selecting the gear-blocked bird story opened the shop, with the $480 wildlife lens disabled until affordable.
- Browser: a separate funded test notebook bought the wildlife lens, reducing $600 to $120 and displaying it as equipped. Accepting the bird story, travelling to the wetland, and applying suggested settings produced a 600 mm, 1/1000 s, f/5.6, ISO 800 close-up at 26 m. Its review showed 100/100, all five checks passed, and a $260 payment. The rendered bird and expanded scenery were visually inspected. Reloading after fixture removal preserved the completed bird brief, photograph, equipped lens, and $380 balance. The final fresh build had no browser console errors or warnings.
- Temporary browser-testing spawn/funding fixtures were removed from the source after verification. Production uses the normal saved progression and mission spawn.

## Motion blur and Space shutter

- Handheld view tests verify subtle time-varying camera angles, bounded amplitude, smooth settling on the tripod, reduced-motion suppression and gentler long-lens aiming. The view offset is applied without changing the player's stored aim.
- Three new automated tests cover shutter sample duration and bounds, tripod/panning/telephoto shake, and exact restoration of animated world transforms after sampling. Water geometry no longer changes when the shutter setting changes; its apparent smoothing comes from the exposure.
- Browser captures at matched exposure: 1/1000 s freezes the runner; 1/15 s on a tripod smears the runner against sharp scenery; enabling Panning at 1/15 s keeps the runner clear while streaking the background and completes the assignment at 100/100.
- A 0.5 s, f/8, ISO 100, ND64 tripod capture softens waterfall streaks while preserving rock edges and completes the creek assignment at 100/100.
- Space captures and saves a photograph from the game canvas. Space in a pause dialog or focused shutter dropdown leaves the photo count unchanged. C remains supported by the same capture path. Capture still respects tripod transitions and cooldowns.
- After fixture removal, C produced a three-frame burst, restored the camera controls and showed the best-frame preview; no console warnings or errors were reported.
- The GPU capture shaders produced no warnings or errors during the initial Space capture. Images retain the centered 3:2 framing and correct orientation. Long exposures are computed immediately with a maximum of 33 samples.
- Testing used isolated named playtest notebooks. Temporary mission discovery, gear, and fixed-time fixtures were removed afterward.
- Preview: `docs/motion-panning.jpg`.

## Scene-depth optics and combined motion

- Replaced the portrait-only canvas blur/ellipse with scene-depth blur in every assignment. The blur radius follows a full-frame thin-lens circle of confusion, aperture, focal length, and axial focus distance. Each temporal sample is blurred before linear-light accumulation, preserving the brief flash contribution.
- The live viewfinder uses the same optics and tone mapping as saved photographs. Autofocus follows an unobstructed assignment subject in the sensor crop, falls back to the center surface when aiming away, and focuses at infinity for sky subjects. The reticle tracks the focus point, and the focus distance is retained in photo metadata and review.
- Three new Node tests cover the focus plane, foreground/background defocus, aperture and focal-length response, closer focus, output resolution, infinity focus, and sensor crop math. The browser harness is included in strict TypeScript checking.
- All eleven GPU checks pass at `/tests/rendering.html` in the Codex in-app browser. At matched exposure, a 120 mm lens focused at 2.95 m increases measured background edge contrast from 1.86 at f/1.8 to 4.98 at f/16, while the textured focused subject remains identical. Refocusing on the background reduces foreground edge contrast from 6.86 to 2.21.
- The live preview and saved f/1.8 frame match exactly at 900 × 600. After resizing to 450 × 900, the centered sensor crop differs from the scaled photo by 1.046 of 255 mean RGB levels. Motion and depth blur also coexist in a single exposure.
- Actual world captures compare the runner at 1/1000 s and 0.5 s: subject pixels change by 9.79 mean RGB levels while static scenery remains identical on a tripod. Panning changes background pixels by 19.04 levels. Returning to the original sample restores an identical frame.
- A deliberately failed sample restores the previous render target and auto-clear flag. The game releases capture controls on rendering failure and retains earlier successful burst frames.
- Game UI: a 120 mm f/1.8, 1/1000 s portrait focuses at 9.0 m, saves with visible background separation, and passes the couple assignment at 100/100. The new focus controls and review were inspected in the normal game, using only the isolated `rendering-checks` notebook.
- No browser console errors or warnings during the GPU checks or portrait capture. Production build passes; the existing bundle-size warning remains. Kernel limits and transparent-surface/silhouette approximations are documented in the development plan.

## Filter purchases, graduated ND, and glass reflections

- Filters are purchasable gear: ND16 $45, ND32 $60, ND64 $75, CPL $90, and soft GND8 $100. Ownership gates fitting, suggested settings, and capture. New notebooks start without filters; pre-filter-shop saves retain ND64/CPL as gifts. A saved migration marker prevents gifts being added to new notebooks on later loads.
- Seven additional Node tests cover purchase gating/prices/duplicate charges, ownership round-trips, idempotent legacy gifts, four/five/six-stop ambient and flash attenuation, graduated endpoints/transition/metering, all three uniform NDs in the creek assessment, rejection of GND for that lesson, and actual planar reflection suppression without removing glass tint. The wildlife funding test now includes ND64/CPL costs and five early assignments.
- All sixteen GPU checks pass. Graduated ND reduces measured top brightness by 133.03 of 255 RGB levels while leaving the bottom identical. Moving the transition changes the middle exposure. Graduated live preview matches capture, including the centered crop after portrait resizing. Previous motion/depth checks continue to pass.
- The bakery window renders actual reflected scenery at 512 × 256. At matched exposure the CPL comparison changes window pixels by 20.01 mean RGB levels; reflected trees and buildings fade and the baker becomes visible. The center mullion was moved off the baker's face. Fixed polarizer suppression remains a simplified model.
- UI playtest used only `filter-checks`: selecting unowned ND16 opened the shop and retained the prior fitted filter. Buying it changed the wallet from $460 to $415 and fitted it. Suggested settings chose ND16, 1/4 s, f/11, ISO 100; the tripod waterfall photograph passed 100/100 and paid $180.
- Buying ND32, ND64, CPL, and GND8 brought total filter spending to $370 and the wallet to $270 against $640 earned. Owned rows show fitting/removal controls. Ownership, the fitted GND, and its 65% transition survived reload without added gifts or charges. Moving the transition after reload raises the viewfinder; a saved GND frame retained its 60% transition in review and correctly failed the uniform-ND creek lesson.
- No browser shader errors or warnings during rendering checks or captures. Strict TypeScript, production build, and Node tests pass; the existing bundle-size warning remains.
- Preview: `docs/polarizer-comparison.png` (matched exposure, no CPL above / CPL below).

## Reflective water and swimming fish

- The main lake and wetland render translucent water with animated ripple distortion, reflected scenery, and angle-dependent reflection strength. CPL suppresses the reflection contribution to 12%; underwater tint and fish remain intact. The terrain has shallow submerged basins while the jetty remains level and walkable.
- Four schools contain 23 fish, rendered in four instanced draw calls per school. Three new Node tests check fish bounds above the lakebed/below the surface across negative and positive simulation times, deterministic rewind, surface depth/polarizer behavior, and reflection isolation/visibility restoration on failure. Existing viewpoint, trail, movement, filter, and motion checks continue to pass.
- All 22 GPU checks pass. At matched exposure, CPL changes lake pixels by 10.90 mean RGB levels. Removing fish changes the submerged region by 4.03 levels, confirming visibility through the surface. Animated frames and a one-second swimming exposure differ from a frozen frame, returning to the original simulation time restores an identical frame, and the live viewfinder matches the saved photograph.
- The rendered comparison was visually inspected: reflections of shoreline trees soften the underwater scene without CPL; fitting CPL clears glare over fish, pebbles, and plants. No shader warnings or browser errors occurred. Water/transparent-surface optics remain stylized approximations.
- Normal game playtest used only the separate `water-checks` notebook. The live viewfinder showed rippled lighthouse/shoreline reflections and submerged fish. Capturing saved a lake photograph successfully without browser warnings or errors; the player's notebook was untouched.
- Preview: `docs/water-and-fish.png` (lake comparison: no CPL on the left, CPL on the right, at matched exposure).
- Game preview: `docs/reflective-lake.png`.

## Expanded waterfall, cliff and connected river

- Fern Creek has a roughly nine-metre falling curtain over a cliff more than 20 metres wide. Offset rock strata, moss on the upper faces, firs, bank boulders, and ferns replace the old small rock backdrop. Whitewater, spray, expanding plunge-pool rings and downstream foam animate from absolute simulation time.
- The channel widens into a plunge pool and bends into Willow Lake through the opened western shore. Two additional Node tests sample the entire channel to verify visible surface coverage, submerged terrain, blocked water/cliff movement, ranger access, cliff/fall dimensions, finite negative-time animation, and exact foam/spray rewind. All viewpoint, trail, fish, exposure and economy tests still pass.
- All 26 GPU checks pass. A matched-exposure half-second capture changes falling water/spray by 4.41 mean RGB levels while a cliff region stays sharp. Returning to the initial simulation time restores an identical frame, and the live viewfinder matches the saved waterfall photograph. Existing depth of field, lake/CPL, fish and motion checks continue to pass.
- Browser playtesting uses only the separate `creek-checks` notebook. A 35 mm, 0.5 s, f/8, ISO 100, ND64 tripod photo from the updated viewpoint in afternoon light passes at 100/100 and pays $180. The enlarged scene and river connection were visually inspected. No shader warnings or browser errors occurred.
- Strict TypeScript, production build, 85 Node tests, and whitespace checks pass. The existing bundle-size warning remains. Water effects are stylized and do not simulate fluid dynamics.
- Previews: `docs/fern-creek.png` and `docs/waterfall-shutter-comparison.png`.

## Remaining validation

No native application or Linux browser run yet. Performance targets require profiling on target hardware. Observed frame counters in the current browser are not a cross-platform benchmark. Do not treat the simplified visual effects as physically accurate optics.

## Living town, chapel and southern coast

- Strict TypeScript and production build pass. 91 Node checks pass, including six new checks covering local schedules across midnight, closing-time continuity, 192 sampled clock positions for every local, live dialogue proximity and attached markers, active versus parked traffic, night lighting/wildlife, collision cleanup and exact temporal rewind, chapel/street/beach access, coast water boundaries and positional/day-night ambient levels.
- The existing 26 GPU checks pass in the Codex browser, including motion/depth accumulation, runner tracking, polarization, fish/waterfall visibility and exact frame restoration. No browser shader warnings or errors were reported.
- Playtested only `/?playtest=living-town`: map shortcuts reach the neighborhood, chapel and ocean; the chapel door shows its central aisle, pews and altar; the beach shows surf and circling gulls. Meditation to 23:00 darkens the sky, lights the streets and leaves quieter traffic.
- Sound controls render correctly; mute and a changed 35% volume survive reload. Audio unlock, mute, menus and tab/window silence are wired through the Web Audio master gain. Synthesized sound quality has not been assessed by listening; automated checks validate the ambient level model, not perceptual audio fidelity.
- The existing Vite bundle-size advisory remains. Animation uses scheduled routes and activity windows; this is not a full traffic, animal-needs or interior-NPC simulation.

## Manual focus and sharpness feedback

- Six new tests cover logarithmic focus control and infinity, locked-plane persistence, legacy/malformed save defaults, one-shot acquisition, keyboard bounds, aperture-dependent sharpness, axial subject depth, defocused portrait rejection, and sky focus guidance. All 97 Node tests pass; strict TypeScript checking and the production build pass. The existing Vite bundle-size advisory remains.
- Browser testing used only the isolated `rendering-checks` notebook. At 120 mm and f/2.8, manual focus at 0.7 m visibly softened the newlyweds, turned the reticle amber, and produced a 75/100 photograph with a failed Focus check and MF metadata. Pressing Q reacquired 9.01 m while retaining manual mode.
- The nearer-focus keyboard shortcut changed the locked distance to 8.37 m. Reloading preserved both MF mode and that distance. Suggested settings restored autofocus and disabled the manual slider.
- A three-frame manual burst retained the locked distance and saved three 100/100 frames. Only one $150 mission payment was awarded, and focus controls were disabled during capture and released afterward.
- All 26 browser GPU checks pass, including refocusing foreground/background, live/capture agreement, motion accumulation, portrait sensor cropping, reflections, water, and renderer restoration after failure. No browser console warnings or errors were reported.
- The preview is saved in `docs/manual-focus.png`. Sharpness checks use the assignment’s central subject plane and the rendered sky’s far depth; checking every group member or the whole landscape remains outside this approximation.

## Notebook, camera store, and arrival prototype — September 30, 2026

- 102 Node tests pass, including disjoint mission lists, completed-active separation, store collision/proximity, deer distance and unobstructed framing through the arrival hour, introductory technique feedback, reduced-motion camera paths, opening cleanup, and walkable arrival dock. Strict TypeScript checking and production build pass; the pre-existing bundle-size warning remains.
- Browser playtesting used isolated `arrival-final` and `filter-checks` saves, leaving the player's notebook untouched. The opening's boat arrival, ranger dialogue, camera handover, and playable deer photograph were inspected. Esc skips to the lighthouse, and reloading the skipped notebook bypasses the opening. A 100/100 deer shot saves in Journal and advances to the lighthouse with 40 XP and no cash.
- Active, Available, and Completed views were inspected against a funded fixture. Paid assignments appear only in Completed and their cards say replay earns no extra payment. Settings has sound, graphics, controls, and notebook management; Explore has map, lighting, and meditation.
- The store map shortcut lands at a reachable storefront with an R prompt. Buying the $120 zoom lens and $75 ND64 from $460 leaves $265. LENS and FILTER change gear directly during play. The new lens selector and owned-filter selector were inspected.
- The Settings layout was inspected at 1280 × 720 and 480 × 740. The narrow view has no horizontal overflow (document and scroll widths both 480 px), with the main tabs and Resume visible. No browser warnings or errors were observed.
- A screenshot of the new Assignments menu is saved as `docs/field-notebook.jpg`.

## Walking introduction, wildlife awareness, and wide exploration view — October 1, 2026

- All 110 Node tests pass. Eight new checks cover sneak speed and Shift precedence, different noise ranges, continuous escape on dry ground, quiet recovery, deterministic shutter sampling, frightened-deer feedback, a connected dock-to-meadow walking route, lens-independent exploration FOV, reversible camera transitions, and reduced motion. Strict TypeScript checking and the production build pass; the existing bundle-size advisory remains.
- Isolated `walking-deer`, `walking-skip`, and `walking-skip-button` notebooks were used for browser checks. Continuing the camera handover, Escape skipping, and the visible skip button all leave the player at the arrival dock with the deer assignment. Reloading preserves the dock position and bypasses the opening. The active assignment opens map directions, and map travel buttons are disabled until the first deer photograph.
- C toggles the visible Sneaking state without taking a photo. E raises and lowers the viewfinder with a camera-and-hands overlay and a changing FOV; the overlay disappears and the shutter becomes available when the transition settles. The lowered view is visibly wider than the 35 mm viewfinder. No browser warnings or errors were observed.
- `docs/walking-introduction.jpg` shows the wide exploration view from the dock and the active sneak toggle. Wildlife response and route continuity were checked in automated world/state tests; a complete live walk and deer capture were not repeated in this pass.

## Arthur’s story, gallery and housing — October 1, 2026

- 119 Node tests pass, including seven new campaign checks for the complete chapter/print/return chain, gated side jobs and legacy discoveries, successful distinct gallery prints, day income/rent/arrears, cottage purchase and reload preservation, bear distance/gear/shutter/flash requirements, the overnight CPL assignment, physical gallery/porch access, reflection suppression and deterministic bear poses. The updated curriculum contains sixteen assignments.
- Browser playtesting used only `story-review`. A development-only fixture skips the initial walk; all six main photography assignments were then completed with actual rendered captures. The deer print and first Arthur visit unlocked the wedding; the two wedding captures led to sports, then June’s tip. The town hall was photographed at night with 1/125 s, f/2.8, ISO 6400 and CPL. Buying the wildlife lens allowed the final bear capture from about 30 metres; printing it and visiting Arthur displayed the reconciliation ending.
- Five different successful photographs opened the exhibition. Printing four paid frames charged $20; meditation across midnight credited $5 and debited $2 rent, changing the wallet from $650 to $653 on day 2. A subsequent $480 lens purchase left $173. Reloading retained the exact wallet, day, exhibition, six prints, gear and ending flag, with no duplicate income. Replaying the completed bear returned a 100/100 photograph with no new payment or story interruption.
- The bear was turned toward the viewpoint and its suggested focal length reduced to 250 mm after visual inspection of the first capture. The revised photo shows the face, nose, ears, body and legs; a 232 mm replay from 27.5 m passed at 100/100. Gallery prints are visible on physical wall frames. The default narrow browser view has no page overflow (591 px viewport and document width).
- All 26 existing GPU checks pass, including preview/capture agreement, optics, motion, graduated filters, reflections, fish, waterfall and renderer restoration. No warnings or errors were reported in the game browser. Saved previews: `docs/story-gallery.png`, `docs/story-ending.png`, `docs/story-bear-review.png`, and the captured `docs/story-bear.jpg`.
- Strict TypeScript and production build pass. The existing bundle-size advisory remains. Narrative scenes are captioned; housing has financial ownership and map locations rather than furnished interiors, and the ending is a written scene.


## Character voices and audio mix — October 1, 2026

- Seven characters have deterministic, nonverbal voices with different pitch, resonance and pacing. Vowel filters, mild vibrato, soft envelopes and punctuation pauses shape short passages; long dialogue is capped at 40 syllables/eight seconds. Introduction captions, NPC dialogue, June’s report and Arthur’s optional memories trigger voices. Dialogue text remains immediately readable.
- A separate voice route remains audible while conversation pages pause the world. Both routes share mute, live volume, a rumble filter and compression before the final volume stage. World ambience ducks under introduction voices. Replacing/closing a conversation, skipping the introduction, muting, hiding the tab and losing focus cancel playback and pending lines. Future bell strikes and other effects are faded and cancelled when leaving the world.
- Wind and surf use layered colored noise with a crossfaded looping seam. Steps alternate gently in stereo, with different noise offsets, filter frequencies, weights and a low impact tone; sneak and run retain their different cadence and level.
- All 138 Node tests and the production build pass, including seven new voice/routing/lifecycle checks. The existing bundle-size advisory remains. Nine real-browser OfflineAudioContext checks pass: seven character waveforms and cancellation before/during playback. At default volume, the measured voice RMS spans 0.0149–0.0177, peaks 0.0770–0.0898, and the largest consecutive sample change is 0.0120; ending/cancelled tails are silent. These signal checks do not replace perceptual listening.
- Browser playtesting used only the separate audio-checks notebook. Arthur’s conversation, a selected memory, return to the pause menu and Mara’s dialogue opened without browser warnings/errors. The development-only /tests/audio.html page provides live auditions, rendered voice samples, and isolated game fixtures; the player’s normal notebook is untouched.


## Harbor stories · 1 October 2026

- All 150 Node tests pass, including six new harbor checks: optional progression and first meeting, printed-photo handoff and repeated save migration, context and technique failures, actual full-boat/person framing across portrait and wide viewports, missing/hidden/blocked/cropped subjects, walkable harbor corridors and reversible character animation.
- Strict TypeScript and the production build pass. The existing large-bundle advisory remains.
- Browser playtesting used the isolated `harbor-stories` notebook. Met Ruth, completed real environmental portrait and crew captures at 100/100, earned $120 and $160 once, printed both at the gallery for $10 total, returned to Ruth for the caption review, and reloaded into the completed harbor story. The newspaper follow-up and Arthur’s new dialogue were inspected; no browser console warnings or errors appeared.
- Visual inspection led to a wider harbor yard, clear portrait viewpoints, crew facing the camera, and moving trail signs out of the composition. The new models and open hull were inspected in the viewfinder and saved crew photograph.
- Saved evidence: `docs/harbor-crew.jpg`, `docs/harbor-crew-review.jpg`, and `docs/harbor-story-ending.jpg`. Development-only `/tests/harbor-playtest.html` provides isolated meeting, real-capture and caption-review fixtures.
- This expansion does not establish hardware performance targets or simulate an approved road alternative.


## Photo sets and perspectives · 1 October 2026

- All 156 Node tests pass. Six new series checks cover either capture order, deferred and once-only payment, failed views and repeated bursts, three-view briefs, normalization and receipt recovery, journal eviction and reloads, legacy completed commissions, disjoint perspective checks, and walkable/clear/focused viewpoints across portrait and wide sensor crops.
- Strict TypeScript and the production build pass. The existing large-bundle advisory remains.
- Browser verification used only the isolated `photo-series` notebook via `/tests/photo-series-playtest.html`. Ruth’s establishing burst produced three usable frames and exactly one accepted view, with no new commission ($900 remained). The receipt and selected next view survived reload. A second-view burst from the same position scored 80/100 and did not fill the set. Moving to the west viewpoint produced 100/100, completed 2/2, and paid $120 exactly once ($1020 total). The completed set and workshop unlock survived reload.
- Both pottery views were captured with the tripod at 100/100. The closer oblique view paid $150 after the set completed; reload preserved 2/2 and $1050 total. Completed-view selection and replay controls were inspected. The revised curved vase and open rim were visually inspected. No browser warnings or errors were observed.
- Saved evidence: `docs/photo-series-progress.jpg` (accepted 1/2, unpaid), `docs/photo-series-complete.jpg` (both required workshop views), and `docs/photo-series-pottery.jpg` (2/2, 100/100 and $150 paid). Automated tests cover receipt retention after journal eviction and the metadata retained by storage fallback; actual browser quota exhaustion was not induced.
- Perspective checks use horizontal camera distance and bearing around a shared assignment anchor. Vertical viewpoint differences are not currently separate requirements. The gallery continues to hang one representative frame per completed assignment.

## Conversations beside the speaker

- `npm run build` passes; `npm test` passes 160 tests, including dialogue text preservation, milestone-aware optional questions, speaker projection across desktop/mobile/landscape, and clear camera sightlines at eight routine hours.
- In-app browser checks used isolated story-expansion and harbor-stories notebooks. Arthur remains visible on desktop and a phone-sized viewport; selecting a memory puts its text at the top of the compact panel. June’s personal question and page controls work, and delivering both photographs still publishes the report. Ruth remains visible facing the lens in the workshop and answers the new question about Nessa and Kit.
- Long assignment briefs and porch activities scroll independently, with exit/gallery actions held below the scrolling content. Escape and the close button end a conversation directly. Player position, aim, gear and game time are not changed by the conversation lens.

- Message dismissal: browser verification confirms both Close and Escape leave the dialog closed and focus the game canvas, with no intervening pause menu. Escape also ends meditation directly.

## Walking directions · 1 October 2026

- All 164 Node tests pass. Four new navigation tests cover collision-safe detours, thin barriers, disconnected and invalid destinations, camera-relative bearings, route distance, and routes from the ferry to every assignment view and public entrance. Each route segment is checked against the same collision predicate used by the player, including smoothed shortcuts. Routes can be rebuilt from intermediate positions.
- Strict TypeScript and production build pass; the existing bundle-size advisory remains. `git diff --check` passes.
- Browser checks used only the isolated `walking-directions` notebook. Starting directions for the opening deer preserved the dock position and showed 81 m on foot; reload restored the same destination. Camera mode hid the cue. Explore displayed the dashed route at both region and town scales, while opening travel shortcuts stayed disabled.
- The closer workshop portrait survived reload and remained the selected view when choosing Walk from the map. The guide fit a 354 CSS-pixel viewport without page overflow, alongside existing thumb controls. The temporary viewport override was reset afterward.
- The gallery arrival fixture cleared and saved the destination, showed the R prompt, and retained position, completion and equipment state. Cancellation from the cue survived reload; Stop directions from the map removed its summary. A saved route behind the studio rebuilt to the gallery with a 68 m path. No browser warnings or errors were observed.
- Development-only `/tests/navigation-playtest.html` provides dock, detour, arrival and selected-view fixtures plus visible save metadata. Evidence: `docs/walking-directions.png` and `docs/walking-route-map.png`.
- Routes use a two-metre search grid with collision sampling every 0.2 m, and may cross open meadows rather than staying on marked trails. They guide the player without moving them automatically. This does not establish hardware performance targets or add new collision geometry.

## Scenery and ambient life · 2026-10-01

- Added smoother terrain lighting, a sky gradient and solar halo, rounded lit cloud banks, varied tree foliage, house siding and doorstep details. Instanced scenery adds 6,500 wind-animated grass tufts, 180 shrubs and six wildflower beds with separate petals and centers.
- Seven rabbits hop and graze on dry ground, 22 inland birds circle in two flocks, 16 butterflies visit the gardens, and 45 softly glowing fireflies appear near the lake after dusk. Static animal parts are batched by material; vegetation uses instancing. Wildlife follows clock-based activity windows rather than a needs simulation.
- All 32 human models have independent breathing and articulated head/posture motion. Standing characters gesture; walking and running retain their limb cycles. Arthur, the three workshop characters and the arrival ranger participate. Props and spectacles stay with the corresponding animated body part; local markers remain centered over their actual positions.
- All 167 Node tests pass. New coverage checks grass/trail clearance, rabbit ground and collision safety, idle joints across the entire cast, day/night visibility, and exact restoration after shutter sampling. Existing walking routes, subject sightlines, conversations and photo-set framing continue to pass.
- Production build and strict TypeScript pass. The existing large-bundle advisory remains.
- All 26 GPU rendering checks pass in isolated headless Chrome, including depth of field, motion blur, graduated filters, window/water reflections, fish, waterfall and exact frame restoration. No shader errors occurred. The rendering harness emits the existing Canvas2D frequent-readback performance advice.
- Visually inspected lake, meadow, garden, harbor, Arthur, bird flocks and night scenes. The isolated harbor-stories notebook captured an animated crew portrait at 100/100 and retained completion after reload, without browser errors. The player's notebook was untouched.
- Development-only `/tests/living-world.html` provides seven fixed views and an animation toggle, without notebook access. Saved evidence: `docs/living-meadow.png`, `docs/living-sky.png`, `docs/living-twilight.png`, and `docs/living-harbor.png`. Instancing and batching reduce overhead; target-hardware frame-rate benchmarking remains unverified.

## Distant sun and east-to-west motion · 2026-10-01

- The old visible sun orbited only 75 metres from town, inside the expanded terrain. Sunrise also used −X even though map east is +X. Corrected the path to rise at +X, cross the southern sky (+Z) and set at −X, retaining the existing 06:00–18:00 daylight cycle.
- Celestial light sources now orbit at a constant 1,040 m radius derived from the map size. Sun/moon discs render at sky depth using camera rotation alone, eliminating walking parallax and far-plane clipping. Their angular diameters are 1° and 0.8°. The sun disc, halo and directional light share the same direction; the moon remains opposite. Shadow camera depth was expanded for the new light-source distance.
- All 168 Node tests pass. Added checks for continuous east-to-west motion, the southern daytime arc, constant orbit distance, disc/halo/light alignment and shadow-depth coverage of map corners and elevated terrain throughout the day.
- All 29 GPU checks pass. New rendered checks verify the sun at dawn, noon and late afternoon, unchanged sky/disc position and size from opposite map corners (0.000 mean pixel difference), visibility with a 60 m camera far plane, and the same behavior for the moon. Existing optics, motion, reflections and photograph restoration checks still pass. No browser errors occurred.
- Strict TypeScript and production build pass; the existing bundle-size advisory remains. The scenery inspector includes east-facing morning and west-facing evening views. Evidence: `docs/sunrise-east.png` and `docs/sunset-west.png`.

## Tree bases embedded in terrain · 2026-10-01

- Forest trunk bottoms previously touched the analytic height, while the visible terrain is offset downward by 5.5 cm and interpolates between grid vertices. Added a surface-height sampler matching the rendered terrain triangles, sharing its grid resolution and offset with mesh construction.
- All 1,700 forest and seven broadleaf trunks extend 18 cm beneath the lowest sampled surface under their full footprint. Extending trunks downward preserves existing canopy positions. Broadleaf trunks remain one instanced batch. The four waterfall firs sample their actual rock ledges; the rear fir was moved 0.7 m onto the continuous ledge instead of hanging beyond its edge.
- Three grounding tests pass: surface samples match ray intersections with the rendered mesh, all 1,707 trunk bases remain buried across 25 footprint samples each, and all four cliff fir bases penetrate their supporting rock. The three ambient-life tests also pass, including idle animation for the expanded cast.
- All 29 GPU checks pass with no browser errors, including photograph restoration, reflections, water, motion and celestial placement. Close ground-level lake and hillside views were visually inspected. Evidence: `docs/rooted-lakeside-trees.png` and `docs/rooted-hillside-trees.png`; both views are available in `/tests/living-world.html`.
- Strict TypeScript and production build pass. The full suite passes 182 of 184 tests; two unrelated hospital-route and street-collision checks fail during concurrent hospital construction in the shared workspace. Grounding changes do not alter walking blockers.


## Hidden keepsakes · 2026-10-01

- Thirty unique local-history keepsakes have distinct names, stories, hiding places and physical silhouettes. Finds span the arrival shore, harbor, town, meadow, woods, wetland and all four outer landmarks. Short-range glints assist discovery without revealing locations on the map. R pickup requires proximity, matching elevation and a clear ray through existing scenery.
- Collection progress is separate from assignments, story gates, money and XP. The final unique find delivers Elspeth’s invitation in the Keepsakes page. The historian beside the gallery gives the engraved heritage compass once, after all thirty finds; its receipt remains in the collection. Existing saves migrate to an empty collection. Backup/restore includes finds and gift; a fresh notebook restores all hidden models.
- All five new collection tests pass, covering unique catalog entries, malformed and legacy saves, duplicate pickups, the final-find gate, single gift receipt, save round trips, standing/sneaking proximity, visibility callbacks, actual model uniqueness, hide/reset behavior and collision-safe routes from the ferry to every find and the historian.
- Browser verification used only the isolated keepsakes notebook: first pickup and reload, automatic 30/30 invitation, historian conversation, gift acceptance and reload with no second gift action. Inspected collection and reward layouts at desktop and narrow sizes. Evidence: docs/keepsakes-reward.png. The development fixture is /tests/collectibles-playtest.html.
- Strict TypeScript, production build and git diff --check pass. The final full suite passes all 185 tests. An earlier street-boundary failure from concurrent hospital construction was resolved before this final run. The collection does not change walking blockers.


## Dangerous bear encounter · 2026-10-01

- Added a live bear warning, charge, contact bites with a 1.5-second cooldown, and hospital recovery after four bites. Staying at the overlook is safe; approaching within 10 metres provokes an immediate charge. Running can outrun the bear, and the chase stays near its clearing. Injury counts survive reloads and recover after 20 seconds safely away.
- All 185 Node tests pass. Nine new checks cover warning/retreat, lingering and sneaking, four-bite knockout, escape and recovery, collision barriers and bounded movement, deterministic rendering, hospital access and a clear route to town, and save normalization. Production build passes with the existing bundle-size advisory.
- In-app browser verification used only the isolated bear-review notebook through tests/bear-playtest.html. Observed individual bite feedback and the four-bite hospital message, dismissed the message to inspect the ward and bed, and reloaded into the hospital with no renewed damage. The safe-overlook fixture showed no warning or bite HUD. No browser errors or warnings were recorded. Saved recovery screenshot: docs/bear-hospital.jpg.
- The hospital sits east of the neighborhood at (60, 35), with a walkable open ward and an Explore/map destination. An initial placement crossed the neighborhood street; the placement was moved, and all existing street and photography-viewpoint checks now pass. Camera trembling and bite recoil respect reduced motion. Menus pause encounter progression, and photographic temporal samples cannot apply bites.


### Hospital road clearance follow-up · 2026-10-01

- Rechecked the current hospital at (60, 35) against the complete rendered neighborhood road, access road and both sidewalks. Its outer footprint, including roof overhangs, starts at x=55.25; the nearest sidewalk edge ends at x=52.4, leaving approximately 2.85 metres of clearance.
- Added a regression that checks every rendered road/sidewalk strip against the hospital footprint, rather than relying solely on walkable street centrelines. The access road meshes now have names for this inspection. All 186 tests pass and the production build was regenerated successfully.

## Town surface detail and mobile rendering cost · 2026-10-01

- Added generated, mipmapped timber, slate and stone materials, gabled roofs, eaves and framed windows. Nearby scenery was inspected in the town, neighborhood and lakeside views; the normal game was checked at a 390 × 844 viewport using an isolated test notebook, including a successful saved photograph. Visual reference: `docs/town-fidelity.png`.
- Static house, chapel, lighthouse, bench and shelter details are material-batched while preserving collision meshes, subject targets and character joints. Scene-level batches use 32-metre cells. Trees and scattered ground details use 64-metre instance cells; grass and shrubs use 48-metre cells. An automated check verifies instance transforms/colors and offscreen cell culling; existing tests still inspect all 1,707 forest/broadleaf trunks and every grass instance.
- At the fixed town-center camera (15, 1.7, 28), looking at (4, 2, -22), 15:00 and t=24, the 1200 × 750 all-refresh inspection frame dropped from 9,442 draw calls / 5,371,932 submitted triangles to 8,352 / 3,979,943. Spatial instance culling reduces triangles, with some additional draw calls for smaller cells.
- The updated harness counts every pass with `renderer.info.autoReset=false`. Over 60 simulated live frames, refreshing shadows every tenth frame, the same town view averaged 6,555 draw calls / 3,682,067 triangles in full-refresh Balanced, 2,322 / 1,323,783 with mobile Balanced reflection scheduling, and 1,643 / 1,027,569 in Performance. Mobile Balanced submits about 65% fewer draw calls than full-refresh Balanced in this comparison. These are workload measurements on the desktop browser, not phone frame-rate measurements; physical device testing remains necessary.
- Mobile Balanced uses a 1.25 pixel-ratio cap and a 66 ms reflection refresh interval; Performance uses 1×, no shadows and 100 ms. Ripples and actors still animate each frame. Capture bypasses the cache for every shutter sample and refreshes the restored live world afterward. Zero-intensity local lights are hidden, and studio spotlights have a finite 24-metre range. The main canvas no longer requests a preserved drawing buffer; photos use their existing render-target readback.
- `npm test`: all 188 checks passed. `npm run build`: strict TypeScript and production bundle passed (existing large-bundle warning). All 29 browser GPU checks passed, covering motion/depth blur, live/saved framing, graduated ND, window/water CPL, fish and waterfall motion, sky placement and failed-capture restoration. No browser warnings or errors in the scenery and GPU pages.

## Ground and house detail; assignment guidance · 2026-10-01

- Assignment location actions now use a single **Guide me to the viewpoint** button for active and completed briefs. The ambiguous **Find the spot** teleport action was removed from Assignments. Explicit **Travel** shortcuts remain in Explore. The guide follows the currently selected photo-set view and preserves position, equipment, completion and rewards.
- Four isolated browser cases verified the opening deer, active lighthouse, completed lighthouse replay and Ruth’s closer portrait view. All kept the player at (8, 94), saved the correct mission/view destination, restored directions after reload and cleared the saved destination on cancellation. The closer view’s cue fitted a 390 × 844 viewport without overflow. Its duplicate view shortcut hides while the cue is visible on compact screens and returns when directions stop. Added opening/completed fixtures to `/tests/navigation-playtest.html`. Evidence: `docs/assignment-guidance.png`.
- Added locally generated, mipmapped ground materials with subtle albedo and bump detail for terrain, gravel paths, asphalt and one-metre paving slabs. World-space UVs keep their scale consistent across terrain, scaled path strips and curved roads. Trail shoulders blend into surrounding grass; walking and terrain geometry are unchanged.
- Houses have horizontal wood grain, varied boards/tiles, projecting window sills, pale roof fascia, ridge caps, stone chimneys and terracotta pots. Window maps suggest sky highlights and curtains without additional reflection passes; masked warm interior emission follows dusk. New static details participate in existing material batches. Road meshes retain their named geometry for hospital-clearance inspection.
- Visually inspected daylight neighborhood/ground views and twilight window lighting. Evidence: `docs/surface-neighborhood.png`, `docs/surface-ground.png`, `docs/surface-twilight.png`. Ground textures add no scene geometry; the fixed neighborhood frame submits 2,771 draw calls / 1,105,262 triangles versus the preceding 2,690 / 1,100,834 reference. This is submitted work, not a target-device frame-rate result.
- All 188 Node tests and all 29 browser GPU checks pass, including photo restoration, live/capture agreement, focus, motion, water and sky. Strict TypeScript, production build and `git diff --check` pass. The existing bundle-size advisory remains. No game or shader errors occurred; bare development harness pages request the absent `/favicon.ico` (404), while the main game uses the existing `/favicon.svg`.

## Observatory hillside grounding · 2026-10-01

- Northstar Observatory previously used the summit height for its entire base, annex and steps, leaving gaps of roughly two metres beneath downhill edges. Its stone base now extends below the lowest rendered terrain within its circular footprint. The annex has a separate stone footing, and each existing step extends into the hillside. The terrace, dome, subject target and landmark position retain their heights; terrain and walking blockers are unchanged.
- A regression raycasts upward into the actual bottom faces across all seven footings at 0.25-metre intervals and checks that each penetrates the rendered terrain by at least 0.1 m. It also verifies the existing terrace height. All 189 Node tests pass, including landmark sightlines and collision-safe routes to every assignment and public entrance. Strict TypeScript, production build and `git diff --check` pass; the existing bundle-size advisory remains.
- Front and downhill annex views were inspected in an isolated browser with no game or shader errors. Both views are available in `/tests/living-world.html`. Evidence: `docs/observatory-grounded.png` and `docs/observatory-annex-grounded.png`.

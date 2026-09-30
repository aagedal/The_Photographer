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
- Esc opens the pause menu. Assignments, journal, map, and controls are accessed there; Esc from a submenu returns to the menu, and Esc from the menu resumes.
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

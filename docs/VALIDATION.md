# Prototype validation

Validated on 30 September 2026.

## Automated

- 66 tests pass using Node's test runner.
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

## Remaining validation

No native application or Linux browser run yet. Performance targets require profiling on target hardware. Observed frame counters in the current browser are not a cross-platform benchmark. Do not treat the simplified visual effects as physically accurate optics.

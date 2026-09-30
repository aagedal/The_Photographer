# Prototype validation

Validated on 30 September 2026.

## Automated

- 33 tests pass using Node's test runner.
- Exposure math: doubling ISO, exposure time, or aperture area changes exposure by the expected stop.
- Filters: ND64 attenuates six stops; prototype CPL attenuates one stop.
- All twelve suggested camera setups pass their assignment's lesson assessment with valid framing.
- Missing filters, inappropriate motion settings, absent tripod, poor framing, obstruction, and unusable exposure prevent completion.
- World integration: every assignment viewpoint is walkable, its subject exists, and its subject is unobstructed from that viewpoint.
- Lake and boundary restrictions work while the pier stays walkable.
- Flash tests cover inverse-square distance falloff, power/aperture/ISO/filter response, shutter-independent pulse exposure within sync, suppression beyond sync, and a lit close portrait with dark ambient exposure.
- Studio tests cover continuous-light metering, moving and aiming the actual lights, colour and power, disabling lights, and migration of old/malformed lighting saves.
- Strict TypeScript check and Vite production build pass. The renderer makes the main bundle larger than Vite's default 500 kB warning threshold (about 153 kB compressed); no build error.

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

## Remaining validation

No native application or Linux browser run yet. Performance targets require profiling on target hardware. Observed frame counters in the current browser are not a cross-platform benchmark. Do not treat the simplified visual effects as physically accurate optics.

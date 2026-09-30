# The Photographer — development plan

## Direction

A compact open world about noticing moments and learning photography through practice. Six disciplines, two assignments each, approximately 90–150 minutes in the eventual finished game. Friendly feedback, no failure punishment, and no requirement to chase technically pristine images when the moment matters.

Use chunky geometry, a warm palette, readable silhouettes, soft shadows, atmospheric fog, and purposeful light. Avoid high-resolution texture production. A small coastal town connects a park, newsroom, wedding garden, studio, sports ground, and dark-sky overlook.

## Foundation decision

Start with TypeScript, Vite, and Three.js/WebGL2. This lets macOS and Linux users play the same prototype in a browser with no native toolchain. Validate lighting and frame time on actual target hardware before committing to the engine. If the world or camera simulation outgrows this foundation, consider Godot; retain the pure TypeScript mission and exposure design as a specification. Native packaging (potentially Tauri) is a later milestone.

Target eventual 60 fps at 1080p on Apple Silicon and a modest integrated Linux GPU. Cap pixel ratio, share geometry and materials, update static shadows only when needed, and offer a performance mode. No claim of hardware validation yet.

## Milestones

1. **Playable foundation (this implementation):** a procedurally built town; walking and mouse aiming; selectable mission board; manual camera controls; actual rendered photo capture; exposure and subject assessment; feedback; local journal and completion saving. All twelve assignment briefs have basic playable scoring. They are prototype scenarios, not twelve finished bespoke missions.
2. **Photography vertical slice:** deepen nature and sports missions first. Add optical depth of field, accumulated motion blur from world samples, focus distance, tripod placement, persistent time/weather, and more responsive subjects. Verify learning by comparing intentionally good and bad captures.
3. **Six disciplines:** bespoke story beats, NPC interactions, sequenced wedding moments, news events and glass/reflection shaders, studio-light placement challenges, sports timing, water accumulation, and a real star field/exposure system. Each mission introduces one concept, then reinforces it in another context.
4. **Progression and finish:** small narrative, equipment loan/unlocks, accessibility and rebinding, gamepad, audio, save export/import, better collisions and terrain, final art pass, playtesting, performance profiling, packaging for macOS/Linux if useful.

## Mission curriculum

| Discipline | Assignment 1 | Assignment 2 |
| --- | --- | --- |
| Nature | Golden-hour landscape: exposure and framing | Water in motion: slow shutter, ND filter, steady support |
| Sports | Freeze the finish: fast shutter, ISO tradeoffs | A sense of speed: slower shutter and panning |
| News | Through the glass: polarizer and reflections | The evening edition: the moment matters more than noise |
| Wedding | Just married: separate subjects with a wide aperture | Everyone together: stop down for group depth of field |
| Studio | A little character: flattering portrait aperture | Every detail: stop down for a product photograph |
| Astro | A sky full of stars: exposure, ISO, tripod | Written in the sky: longer exposure and deliberate star trails |

## Camera and assessment

Exposure uses EV100 = log2(aperture² / exposure seconds) − log2(ISO / 100). ND adds its attenuation in stops to camera EV; a polarizer loses approximately one stop. Scene light defines target EV, with night missions switching to a simplified night scene.

Implemented lighting extension: a manual GN24 flash with 1/64–full power, inverse-square falloff, 1/250 s sync checking, and separate subject/ambient readings. The renderer applies ambient gain in linear space and normalizes flash intensity against that gain, preserving flash exposure when shutter duration changes within sync. Three adjustable continuous studio lights provide key/fill/rim positions, power, height, colour, live shadows, and presets. Their subject meter is calibrated against the default rig. Lighting settings save with the notebook; captures retain their lighting setup. A close-portrait practice setup demonstrates a lit subject against a darker room.

Assess subject visibility, distance, frame placement, exposure, and assignment-specific technique. Explain each dimension individually; reward ISO use when it preserves a moving moment. Require framing, usable exposure, and the central lesson for completion. Store completed mission IDs and a bounded set of photo thumbnails locally.

## Prototype limitations

The post-capture blur/noise, water smoothing, depth-of-field cues, and polarizer appearance are illustrative approximations, not an optical simulator. A polarizer reduces some reflections depending on angle and cannot universally remove window reflections. Panning currently uses a setting toggle rather than measured tracking skill. Studio softboxes are simulated spot lights; bounce lighting, true area-light shadows, flash pulse motion freezing, and high-speed sync remain future work. The light meter approximates subject illumination and does not integrate rendered surface angles or blocked lights. Astro scenes and trails are stylized; the final version needs focal length and an accurate trailing model. Travel shortcuts are for testing. No desktop packages, full NPC story, audio, or mobile movement controls in this first milestone.

## Validation

Automated tests for exposure math, filter attenuation, noisy-but-successful sports captures, ND-supported water exposures, tripod-sensitive night captures, framing failures, and each mission's recommended camera settings. TypeScript checking and production build. Browser inspection of the rendered world, controls, capture/review loop, mission completion, save persistence, and responsive UI. Hardware frame-rate targets remain unverified until profiling on target devices.

## World time and minimal UI extension

Implemented a compact full-screen HUD with assignment details, journal, map, help and quality in the Esc menu. Camera shortcuts: 1/2 shutter, 3/4 aperture, 5/6 ISO, T tripod. Tripod setup/packing uses a brief first-person animation with movement and capture locked during transitions. Captures show a brief thumbnail and open feedback on request.

The world now turns through a 30-minute day, paused in menus and hidden tabs. Sun/moon positions, shadows, sky, fog, stars and outdoor metering follow the clock. Twelve boxy clouds share one instanced draw call and a repeating weather pattern affects sunlight. Meditation skips ahead to named times or the active assignment's preferred light, preserving location and settings. Five briefs have time windows, including overnight intervals; captures retain the time and cloud cover. Cloud shading and coverage are approximations; individual moving cloud shadows and volumetric weather remain future work.

# The Photographer — development plan

## Direction

A compact open world about noticing moments and learning photography through practice. Six disciplines, two assignments each, approximately 90–150 minutes in the eventual finished game. Friendly feedback, no failure punishment, and no requirement to chase technically pristine images when the moment matters.

Use chunky geometry, a warm palette, readable silhouettes, soft shadows, atmospheric fog, and purposeful light. Avoid high-resolution texture production. A small coastal town connects a park, newsroom, wedding garden, studio, sports ground, and dark-sky overlook.

## Foundation decision

Start with TypeScript, Vite, and Three.js/WebGL2. This lets macOS and Linux users play the same prototype in a browser with no native toolchain. Validate lighting and frame time on actual target hardware before committing to the engine. If the world or camera simulation outgrows this foundation, consider Godot; retain the pure TypeScript mission and exposure design as a specification. Native packaging (potentially Tauri) is a later milestone.

Target eventual 60 fps at 1080p on Apple Silicon and a modest integrated Linux GPU. Cap pixel ratio, share geometry and materials, update static shadows only when needed, and offer a performance mode. No claim of hardware validation yet.

## Milestones

1. **Playable foundation (this implementation):** a procedurally built town; walking and mouse aiming; selectable mission board; manual camera controls; actual rendered photo capture; exposure and subject assessment; feedback; local journal and completion saving. All thirteen assignment briefs have basic playable scoring. They remain prototype scenarios rather than finished bespoke missions.
2. **Photography vertical slice:** deepen nature and sports missions first. Extend the implemented scene-depth optics, manual focus and autofocus with tripod placement and more responsive subjects. Verify learning by comparing intentionally good and bad captures.
3. **Six disciplines:** bespoke story beats, NPC interactions, sequenced wedding moments, news events and polarizer rotation and reflection challenges, studio-light placement challenges, sports timing, water accumulation, and a real star field/exposure system. Each mission introduces one concept, then reinforces it in another context.
4. **Progression and finish:** small narrative, deeper equipment progression, accessibility and rebinding, gamepad, audio, save export/import, better collisions and terrain, final art pass, playtesting, performance profiling, packaging for macOS/Linux if useful.

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

Motion blur now averages up to 33 rendered world samples in linear light, with handheld camera rotation, a stable tripod, runner tracking and a single flash pulse. Exposure durations resolve immediately and the bounded sample count can leave discrete trails in extreme motion. Depth of field uses the rendered depth buffer and a thin-lens circle of confusion for all subjects, shared by the live viewfinder and capture. Its 48-tap disk kernel caps the blur radius at 24 pixels at 900 × 600; transparent surfaces and blur around silhouettes remain approximations. Noise remains illustrative. The bakery has a planar scene reflection; CPL suppression is a fixed factor rather than a fully physical polarization model. A polarizer reduces some reflections depending on angle and cannot universally remove window reflections. Panning currently uses a setting toggle rather than measured tracking skill. Studio softboxes are simulated spot lights; bounce lighting, true area-light shadows, variable flash duration, and high-speed sync remain future work. The light meter approximates subject illumination and does not integrate rendered surface angles or blocked lights. Astro scenes and trails are stylized; the final version needs focal-length-dependent optics and an accurate trailing model. Travel shortcuts are for testing. No desktop packages, full NPC story, audio, or mobile movement controls in this first milestone.

## Validation

Automated tests for exposure math, filter attenuation, noisy-but-successful sports captures, ND-supported water exposures, tripod-sensitive night captures, framing failures, and each mission's recommended camera settings. TypeScript checking and production build. Browser inspection of the rendered world, controls, capture/review loop, mission completion, save persistence, and responsive UI. Hardware frame-rate targets remain unverified until profiling on target devices.

## World time and minimal UI extension

Implemented a compact full-screen HUD with assignment details, journal, map, help and quality in the Esc menu. Camera shortcuts: 1/2 shutter, 3/4 aperture, 5/6 ISO, T tripod. Tripod setup/packing uses a brief first-person animation with movement and capture locked during transitions. Captures show a brief thumbnail and open feedback on request.

The world now turns through a 30-minute day, paused in menus and hidden tabs. Sun/moon positions, shadows, sky, fog, stars and outdoor metering follow the clock. Twelve boxy clouds share one instanced draw call and a repeating weather pattern affects sunlight. Meditation skips ahead to named times or the active assignment's preferred light, preserving location and settings. Five briefs have time windows, including overnight intervals; captures retain the time and cloud cover. Cloud shading and coverage are approximations; individual moving cloud shadows and volumetric weather remain future work.

## Mission economy and gear extension

Implemented one-time payments of $120–$260 per completed assignment and an Esc gear shop. The starter kit has a fixed 35 mm lens, tripod, filters, and studio lights; it can complete the original twelve briefs. Bird photography requires the wildlife lens. Players choose a $120 zoom lens (24–120 mm), $180 manual flash, or $360 burst camera. The first five briefs pay $780 against $660 for those three upgrades, so progression needs no repeat grind.

Zoom changes the camera projection while maintaining a consistent 3:2 capture across viewport shapes. Burst mode captures three world samples 200 ms apart, holds exposure settings, allows aiming, retains every frame, previews the highest score, and pays a brief once across the sequence. All purchases, burst preference, and focal length persist. Old completions receive back pay; previously used flash is preserved as a free legacy item. Pure tests cover payments, affordability, save normalization, optics, and burst sequencing.

## Expanded world and discovered missions

Implemented a 260 m terrain mesh around the original level town, with rolling meadow and woodland paths, a northern astronomy ridge, and an eastern wetland. Player height follows terrain; every trail and photography viewpoint is covered by movement and visibility checks. The expanded world uses 520 instanced trees, instanced flowers/stones, and batched static scenery. Characters have shaped bodies, faces, clothing, hands, varied skin tones, and accessories.

A fresh notebook has only the lighthouse assignment. Six named locals reveal the other briefs when approached and spoken to with R or the talk prompt. Discovered stories persist, and the assignment board and map expose only known stories. Gear-ready discovered briefs have travel shortcuts; the lighting practice controls also respect discovery. Legacy notebooks retain previously active, completed and photographed briefs. No completion prerequisite prevents exploring another discipline.

The thirteenth brief is a wetland kingfisher close-up, offered by the creek ranger and gated by a $480 200–600 mm lens. The lens has a separate equipped state and real camera projection. Suggested settings equip it at 600 mm; assessment requires owned/equipped gear, adequate subject scale at 400–600 mm, at least 18 m distance, 1/1000 s or faster, f/5.6 or smaller, framing and exposure. Five early briefs can fund ND64, CPL, and the wildlife lens purchase. Detailed terrain collision, deeper dialogue branches, and more wildlife behavior remain future work.

## Purchasable filters and window reflections

Filters are paid gear: ND16 ($45), ND32 ($60), ND64 ($75), CPL ($90), and a soft graduated ND8 ($100). New saves carry a filter-shop migration marker; older notebooks retain their original ND64/CPL. Ownership gates the dropdown, shop fitting, suggested settings, and capture. Water feedback accepts the uniform NDs, and suggested exposure adapts to the owned strength.

The graduated filter applies a spatial three-stop transition in linear light before depth and motion accumulation. Its transition position persists, and center/subject metering includes the local attenuation. The viewfinder and capture use the same sensor-crop coordinates. The bakery glass uses a 512 × 256 planar reflection with a tenfold CPL reduction. Physical polarizer rotation, filter stacking, and graduation rotation remain future work.

The lake and wetland use translucent surface tint and 512 × 512 planar reflections with procedural ripple distortion and stronger reflections at grazing angles. CPL reduces water reflections to 12% of their original strength. Terrain basins expose submerged pebbles, plants, and four schools totaling 23 fish with deterministic swimming paths and tail strokes. Each school uses four instanced draw calls. Absolute simulation time makes swimming/ripples compatible with temporal photo sampling and restoration. Reflectors exclude one another from their scene passes to prevent nested rendering and texture feedback. Water refraction, caustics, waves with displaced geometry, fish avoidance behavior, and physical polarization remain future work.

Fern Creek now has a cliff more than 20 metres wide and roughly nine metres tall, built from offset faceted strata with moss on the upper faces, firs above, and rocks/ferns along the banks. A procedural falling curtain, instanced spray, expanding pool rings, and downstream foam all use absolute simulation time. A shared channel path aligns river geometry, submerged terrain, and movement restrictions, connecting the plunge pool to Willow Lake through an open shore. The river has its own isolated planar reflection and responds to CPL. The existing water assignment keeps its ID, rewards, and exposure lesson; its focus point and viewpoint now frame the larger scene. Fluid dynamics, waterfalls over multiple ledges, volumetric mist, and water audio remain future work.


## Manual focus and sharpness feedback

Implemented persistent AF/MF selection, a logarithmic 0.7 m–infinity focus ring, nearer/farther keyboard controls, and one-shot autofocus for locked-distance recomposition. The viewfinder and saved photographs share the selected plane. Manual focus is fixed across burst frames; continuous autofocus reacquires each frame. Suggested settings restore autofocus.

The assignment reticle and photo assessment use axial subject depth and the existing thin-lens blur radius. A radius up to two pixels at 900 × 600 is accepted. Astro assessment uses the sky render depth. This is a central-plane check rather than whole-image sharpness analysis; it cannot assess every face in a group. Old photos retain their recorded assessments, and saves without focus settings default to autofocus.

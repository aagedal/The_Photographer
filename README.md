# The Photographer

A small open-world photography game prototype. Explore a warm, low-poly town and its surrounding hills, meet locals for assignments, choose manual camera settings, and learn from the photographs you make.

## Play locally

Requires a modern desktop browser with WebGL2 and Node.js 22.18+ (Node 24 LTS recommended).

```sh
npm install
npm run dev
```

Open the localhost URL printed by Vite. macOS and Linux use the same browser build; native desktop packages are a later milestone. No accounts, external APIs, or paid assets are required. Fonts fall back to system fonts if offline.

```sh
npm test        # camera math and mission assessment
npm run build  # strict type checking and production build
npm run preview
```

## Controls

| Action | Control |
| --- | --- |
| Walk | W A S D |
| Walk faster | Shift |
| Look | Drag the world, or arrow keys |
| Zoom (equipped purchased lens) | Scroll over the world, or − / + |
| Raise/lower viewfinder | E |
| Talk to a nearby local | R or the on-screen prompt |
| Make a photograph | Space, C, or shutter button |
| Slower / faster shutter | 1 / 2 |
| Wider / narrower aperture | 3 / 4 |
| Lower / higher ISO | 5 / 6 |
| Set/pack tripod | T or tripod icon |
| Toggle purchased flash | F or flash icon |
| Single / burst (purchased camera) | B or burst icon |
| Open lighting kit | L or Lighting button |
| Pause menu: assignments, journal, gear shop, map, controls | Escape or Esc button |
| Back to pause menu / resume | Escape |

A fresh notebook starts with **Chasing the golden hour**, the lighthouse assignment. Walk to locals with golden markers and press **R** (or click the talk prompt) to hear their stories. Their briefs are added to **Esc → Assignments**, where you can accept them later. Explore by the creek, track, square, garden, studio, and northern ridge. Travel shortcuts in **Esc → Find the spot** and the map are available for discovered, gear-ready assignments. Frame the marked subject. Adjust shutter, aperture, ISO, filters, and tripod. **Try suggested settings** provides a starting point for experimentation. Feedback evaluates the subject, exposure, and the lesson; try again freely. Assignment XP and payment are earned only once. Photographs and progress save locally in this browser, with the latest 16 frames retained. Taking a photo shows a brief clickable preview without interrupting play. Open the preview or **Esc → Photo journal** for feedback and downloads.

Saved photographs accumulate scene motion over the selected shutter interval: fast shutters freeze subjects, slow shutters soften flowing water and smear the runner. A tripod removes simulated handheld shake; Panning tracks the runner and lets the background streak. Motion blur appears in the photograph, while the live view remains responsive.

**E** previews depth of field through the viewfinder. Autofocus follows the unobstructed assignment subject inside the 3:2 frame; when you aim away, it focuses on the center surface. The AF box and distance readout show the focus plane. Aperture, focal length, and focus distance affect foreground and background softness in every assignment. For obvious separation, try a longer lens and a closer subject at f/1.8–f/2.8; stop down for more depth. The journal retains the captured focus distance.

The HUD contains only compact camera settings, equipment icons, an ambient meter, and a small subject cue. Shortcuts work while playing; focused dropdowns keep their normal keyboard behavior. Without a tripod, the camera has a tiny handheld wobble, softened at long focal lengths for precise aiming. **T** unfolds the tripod in 0.42 seconds and packs it in 0.28 seconds; the wobble smoothly settles during setup and returns during packing. Movement and capture are blocked during the transition, and movement remains locked while deployed. Reduced-motion preferences disable the wobble and skip the animation.

To restart, open **Esc → Controls → Start a fresh notebook**. The current notebook is backed up on this device before the new one starts. **Restore previous notebook** restores that backup.

## Mission payments and gear

Successful assignments pay **$120–$260**, once per brief. Failed attempts cost nothing; repeating a completed brief still saves the photo but earns no extra cash. Open **Esc → Gear shop** to spend your earnings:

| Upgrade | Price | Ability |
| --- | --- | --- |
| 24–120 mm zoom lens | $120 | Change the actual camera framing with scroll or −/+ |
| Camera flash | $180 | Light nearby subjects; F toggles, L adjusts power |
| Burst camera | $360 | Three frames at 5 fps; B toggles single/burst, Space or C shoots |
| 200–600 mm wildlife lens | $480 | Equip it for distant bird close-ups; unlocks the kingfisher brief |
| ND16 filter | $45 | Four stops of uniform light reduction |
| ND32 filter | $60 | Five stops of uniform light reduction |
| ND64 filter | $75 | Six stops of uniform light reduction |
| Circular polarizer | $90 | Reduce glass and water glare; one-stop light cost |
| Soft graduated ND8 | $100 | Up to three stops over the top of the frame; adjustable transition |

The starter kit includes a fixed 35 mm lens, tripod, and studio lights. Filters are separate purchases. New notebooks can fund any first filter with the lighthouse’s $120 payment; filter-free sports, wedding, studio, and astro briefs also earn money. Existing notebooks retain their previously included ND64 and CPL at no charge. Five briefs (lighthouse, creek, freezing the runner, morning baker, and studio portrait) pay $740: enough for ND64, CPL, and the wildlife lens with $95 left over, without repeating a mission. Purchases take effect immediately and save with the notebook. Choose your equipped lens at the top of the gear shop; each has its own focal range, and the equipped lens and focal length persist.

A burst samples the moving world between frames, keeps every frame in the journal, and previews the highest-scoring frame. Camera settings stay fixed during the sequence; you can keep aiming. Completed missions from older notebooks receive back pay, and a flash already used in those notebooks is kept for free. Starting a fresh notebook also resets money and purchases; its backup preserves them.

## Trails, locals, and bird photography

The world is **260 m across**, up from 110 m, with over five times the area. Walk the rolling woodland and meadow trails, climb the northern ridge, or visit the eastern wetland. Player height follows the ground. The town remains level for its existing studio, track and garden scenarios. Characters now have shaped bodies, facial features, hands, clothing details and varied skin tones; locals carry field bags and distinctive accessories. Trees and ground cover are instanced and static detail is batched to limit draw calls.

Mara, the creek ranger, introduces **A flash of blue** alongside the waterfall story. Buy the **$480 wildlife lens** and accept the bird assignment from your notebook. Photograph the kingfisher on its wetland perch from the trail or hide, about 20–35 m away. Use **400–600 mm**, **1/1000 s or faster**, **f/5.6 or smaller**, and stay at least **18 m away**. Suggested settings equip the wildlife lens at 600 mm and set ISO 800. The photograph must show a close-up as well as meet the exposure and technique checks; it pays **$260** once. Aim sensitivity slows at long focal lengths for finer framing.

Mission discovery saves with the notebook. Existing saves retain completed, photographed, and previously active briefs; other stories are found through locals. To experience the one-mission introduction, use **Esc → Controls → Start a fresh notebook**, which backs up the current notebook first.

## Sky, time, and meditation

One 24-hour day takes **30 minutes of active play**. Menus and hidden tabs pause the clock; your saved world time resumes when you return. Sun and moon positions, shadow direction, sky and fog colours, stars, and outdoor exposure change with time. Twelve drifting blocky clouds use one instanced draw call; a repeating cloud-cover pattern gently attenuates sunlight. Clouds are stylized meshes, with approximate coverage and broad light attenuation rather than volumetric weather or individual cloud shadows.

Use **Esc → Meditate** to skip forward with a brief sky transition to dawn, daylight, golden hour, night, or **For this assignment**. Reduced-motion preferences skip the transition; Esc interrupts meditation at the current time. Your location and camera settings stay in place.

Five briefs require particular light:

| Assignment | Time window |
| --- | --- |
| Chasing the golden hour | 16:30–18:00 |
| Through the glass | 06:00–09:00 |
| The evening edition | 18:00–20:00 |
| Both astro assignments | 21:00–04:00 |

Accepting an assignment or travelling preserves the clock. Suggested settings are calibrated for its preferred time; watch the meter as daylight changes. Other briefs accept any time, though outdoor exposure still matters. Controlled studio metering stays independent of the outdoor clock. Captures record their time and cloud cover; older notebook entries remain readable.

## Flash and studio practice

Press **L**, click the lighting icon, or open **Esc → Lighting kit**. After buying the flash, the **Camera flash** tab offers manual power from 1/64 to full. The ambient meter shows continuous light; the subject reading also includes flash. Flash exposure depends on power, distance, aperture, ISO, and filters. Within the 1/250 s sync limit, shutter speed changes the ambient exposure while the brief flash contribution stays constant. Above that limit the flash is suppressed with feedback; high-speed sync is not implemented.

Switch to **Studio lights**, visit the studio, and tune the key, fill, and rim lights. Each has an on/off switch, power, angle, distance, height, and colour. Balanced, dramatic, rim-light, and lights-off presets provide starting points. Adjustments update the actual 3D lights and stands live, and save on this device. Unlike a flash pulse, these continuous studio lights respond to shutter duration as well as aperture and ISO.

**Try a close flash portrait**, available after buying the flash, sets up a nearby subject with the studio lamps off and 1/4 flash power. Compare it with flash off, then change shutter speed to explore the background/subject balance. The flash preview appears as a steady light for easy adjustments; photographs simulate a brief pulse. Captures record flash power and the studio rig in their journal entry.

## Filters and reflections

Use **Esc → Gear shop** to buy a filter. Buying fits it immediately; owned filters have **Fit filter / Remove filter** buttons. The FILTER dropdown switches among owned filters; choosing a locked option opens its shop card. One filter is fitted at a time, and ownership, the fitted filter, and graduated transition height survive reloads.

ND16, ND32, and ND64 attenuate both ambient and flash by four, five, and six stops. All three work for the creek assignment when you balance exposure. Suggested settings adapt to an owned ND: ND16 uses 1/4 s at f/11, ND32 uses 1/2 s at f/11, and ND64 uses 1/2 s at f/8, all at ISO 100. Missing required filters open the shop instead of being supplied by suggested settings.

The soft graduated ND8 darkens the top by three stops and leaves the bottom clear. Fit it to raise the viewfinder, then move **GND transition** to align the soft band with your horizon. The slider previews changes live. Center metering and subject feedback account for attenuation at their position in the 3:2 crop; the saved photograph applies the same gradient to ambient and flash before motion accumulation and tone mapping. A graduated filter does not replace a uniform ND for the creek lesson.

The bakery window reflects actual scenery using a planar reflection. A CPL reduces the reflected contribution to one tenth while retaining the glass tint, making the baker easier to see. Compensate for its one-stop light loss with shutter, aperture, or ISO. Polarizer rotation and fully physical angle-dependent suppression remain future work.

The lake and wetland now have translucent water, animated rippled reflections, shallow basins, and 23 swimming fish. Look down beside the jetty to see a nearby school, or explore the lake edges and bird pond. A CPL suppresses surface glare and makes the fish and lakebed clearer. The schools swim continuously with moving tails; fast shutters freeze them and longer exposures record their movement. Reflection strength increases at shallow viewing angles. Water remains a stylized surface rather than a fluid or refraction simulation.

Fern Creek drops over a roughly nine-metre cliff of layered crags, mossy ledges, and firs. The falling curtain spills into a plunge pool with spray and expanding ripples, then a winding river carries foam into Willow Lake through an opening in the western shore. The creek assignment’s viewpoint frames the enlarged cliff and river. Fast shutters retain whitewater detail; the suggested half-second ND64 tripod exposure softens the flow while keeping the rock faces sharp. The river and cliff restrict walking, with dry banks available for exploration.

## First milestone

- A connected town with six original photography locations, rolling hills, woodland and meadow trails, and a bird wetland, stylized lighting, shadows, animated water and a runner, a moving sun and moon, drifting clouds, and a 30-minute day/night cycle.
- Thirteen playable prototype briefs: the original twelve across six disciplines, plus gear-gated bird photography. Six locals reveal new briefs through dialogue.
- Calculated exposure, filter attenuation, composition/distance/obstruction checks, and lesson-specific feedback.
- Manual flash with distance falloff and sync checking; adjustable continuous key, fill, and rim studio lights.
- Mission payments, a gear shop, unlockable zoom and wildlife lenses, a flash and burst camera, and three-frame sports bursts.
- Actual 3:2 image captures, simplified visual effects, photo review, downloads, and a persistent journal.
- A map, travel shortcuts, keyboard aiming, and a performance setting.

This is a foundation, not the finished game. Motion blur accumulates up to 33 scene samples over the selected shutter interval, with simulated handheld shake, runner tracking, flowing water, and a brief flash pulse. Long exposures render immediately rather than waiting for the shutter duration. Depth of field uses scene depth and a thin-lens blur radius, with a bounded disk kernel; transparent surfaces and blur around silhouettes remain approximations. Panning uses a switch, window reflections render the surrounding scene with simplified polarizer suppression, and star motion follows a simplified sky rotation. Studio softboxes use spot lights with shadows and inverse-square falloff; bounce lighting, true area-light shadows, variable flash duration, and high-speed sync are not simulated. The subject meter uses assignment light, distance, and a calibrated studio rig rather than integrating every surface, light angle, or obstruction; actual shading and shadows are rendered in the scene. The studio assignment reduces ambient scene lighting to make controlled lighting easier to see. Deeper NPC stories, staged events, manual focus controls, audio, full collisions, and desktop packaging remain planned. Desktop keyboard/mouse is required for full exploration; responsive UI is not a complete mobile port.

See [the development plan](docs/PLAN.md) for the full curriculum, milestones, technical direction, and validation approach.

## Source layout

- `src/world.ts` — procedural scenery, lighting, subjects, and animation.
- `src/missions.ts` — assignment curriculum and suggested settings.
- `src/photography.ts` — pure exposure and assessment model.
- `src/optics.ts` / `src/depth-of-field.ts` — thin-lens math and shared scene-depth blur for the live viewfinder and saved photographs.
- `tests/rendering.html` — development-only GPU checks; run the dev server and visit `/tests/rendering.html`. The optional notebook fixture uses a separate playtest save.
- `src/filters.ts` — filter catalog, strengths, labels, and graduated attenuation.
- `src/lighting.ts` — flash exposure/sync, studio settings, and continuous-light metering.
- `src/environment.ts` — world clock, sky/weather sampling, assignment time windows, and outdoor metering.
- `src/exploration.ts` — locals, mission discovery, proximity, and equipment gates.
- `src/terrain.ts` — world bounds, rolling elevation, and trail routes.
- `src/economy.ts` — mission payments, gear ownership, save migration, focal range, and burst timing.
- `src/controls.ts` — camera shortcuts and tripod transition state.
- `src/tripod.ts` — lightweight first-person tripod animation, excluded from captures.
- `src/main.ts` — exploration, camera interaction, captures, UI, and saves.
- `src/style.css` — responsive interface.

The production output is a static `dist/` directory. The prototype has no backend and has not been publicly deployed.

Browser playtesting can use `/?playtest=1` or a named notebook such as `/?playtest=gear-progression` to keep test captures in a separate save from the player's notebook.

## License

MIT. See [LICENSE](LICENSE).

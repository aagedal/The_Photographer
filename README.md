# The Photographer

A small open-world photography game prototype. Explore a warm, low-poly town, accept assignments, choose manual camera settings, and learn from the photographs you make.

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
| Zoom (purchased lens) | Scroll over the world, or − / + |
| Raise/lower viewfinder | E |
| Make a photograph | C or shutter button |
| Slower / faster shutter | 1 / 2 |
| Wider / narrower aperture | 3 / 4 |
| Lower / higher ISO | 5 / 6 |
| Set/pack tripod | T or tripod icon |
| Toggle purchased flash | F or flash icon |
| Single / burst (purchased camera) | B or burst icon |
| Open lighting kit | L or Lighting button |
| Pause menu: assignments, journal, gear shop, map, controls | Escape or Esc button |
| Back to pause menu / resume | Escape |

Open **Esc → Assignments** to select an assignment, then explore or use **Esc → Find the spot**, and frame the marked subject. Adjust shutter, aperture, ISO, filters, and tripod. **Try suggested settings** provides a starting point for experimentation. Feedback evaluates the subject, exposure, and the lesson; try again freely. Assignment XP and payment are earned only once. Photographs and progress save locally in this browser, with the latest 16 frames retained. Taking a photo shows a brief clickable preview without interrupting play. Open the preview or **Esc → Photo journal** for feedback and downloads.

The HUD contains only compact camera settings, equipment icons, an ambient meter, and a small subject cue. Shortcuts work while playing; focused dropdowns keep their normal keyboard behavior. **T** unfolds the tripod in 0.42 seconds and packs it in 0.28 seconds. Movement and capture are blocked during the transition, and movement remains locked while deployed. Reduced-motion preferences skip the animation.

To restart, open **Esc → Controls → Start a fresh notebook**. The current notebook is backed up on this device before the new one starts. **Restore previous notebook** restores that backup.

## Mission payments and gear

Successful assignments pay **$120–$220**, once per brief. Failed attempts cost nothing; repeating a completed brief still saves the photo but earns no extra cash. Open **Esc → Gear shop** to spend your earnings:

| Upgrade | Price | Ability |
| --- | --- | --- |
| 24–120 mm zoom lens | $120 | Change the actual camera framing with scroll or −/+ |
| Camera flash | $180 | Light nearby subjects; F toggles, L adjusts power |
| Burst camera | $360 | Three frames at 5 fps; B toggles single/burst, C shoots |

The starter kit includes a fixed 35 mm lens, tripod, ND/CPL filters, and studio lights. Every brief is achievable with it. The first five assignments fund all three upgrades with $120 left over, without repeat payments. Purchases take effect immediately and save with the notebook.

A burst samples the moving world between frames, keeps every frame in the journal, and previews the highest-scoring frame. Camera settings stay fixed during the sequence; you can keep aiming. Completed missions from older notebooks receive back pay, and a flash already used in those notebooks is kept for free. Starting a fresh notebook also resets money and purchases; its backup preserves them.

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

## First milestone

- A small connected world with six photography locations, stylized lighting, shadows, animated water and a runner, a moving sun and moon, drifting clouds, and a 30-minute day/night cycle.
- Twelve playable prototype briefs: two each for nature, sports, news, wedding, studio, and astrophotography.
- Calculated exposure, filter attenuation, composition/distance/obstruction checks, and lesson-specific feedback.
- Manual flash with distance falloff and sync checking; adjustable continuous key, fill, and rim studio lights.
- Mission payments, a gear shop, an unlockable zoom/flash/burst camera, and three-frame sports bursts.
- Actual 3:2 image captures, simplified visual effects, photo review, downloads, and a persistent journal.
- A map, travel shortcuts, keyboard aiming, and a performance setting.

This is a foundation, not the finished game. Blur and background separation use image-space approximations, panning uses a switch, glass reflections are simulated, exposure durations resolve instantly, and star trails are illustrative. Studio softboxes use spot lights with shadows and inverse-square falloff; bounce lighting, true area-light shadows, flash duration/motion freezing, and high-speed sync are not simulated. The subject meter uses assignment light, distance, and a calibrated studio rig rather than integrating every surface, light angle, or obstruction; actual shading and shadows are rendered in the scene. The studio assignment reduces ambient scene lighting to make controlled lighting easier to see. NPC dialogue, staged events, focus simulation, audio, full collisions, and desktop packaging remain planned. Desktop keyboard/mouse is required for full exploration; responsive UI is not a complete mobile port.

See [the development plan](docs/PLAN.md) for the full curriculum, milestones, technical direction, and validation approach.

## Source layout

- `src/world.ts` — procedural scenery, lighting, subjects, and animation.
- `src/missions.ts` — assignment curriculum and suggested settings.
- `src/photography.ts` — pure exposure and assessment model.
- `src/lighting.ts` — flash exposure/sync, studio settings, and continuous-light metering.
- `src/environment.ts` — world clock, sky/weather sampling, assignment time windows, and outdoor metering.
- `src/economy.ts` — mission payments, gear ownership, save migration, focal range, and burst timing.
- `src/controls.ts` — camera shortcuts and tripod transition state.
- `src/tripod.ts` — lightweight first-person tripod animation, excluded from captures.
- `src/main.ts` — exploration, camera interaction, captures, UI, and saves.
- `src/style.css` — responsive interface.

The production output is a static `dist/` directory. The prototype has no backend and has not been publicly deployed.

Browser playtesting can use `/?playtest=1` or a named notebook such as `/?playtest=gear-progression` to keep test captures in a separate save from the player's notebook.

## License

MIT. See [LICENSE](LICENSE).

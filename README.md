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
| Zoom | Scroll over the world |
| Raise/lower viewfinder | E |
| Make a photograph | C or shutter button |
| Set/pack tripod | T or Tripod toggle |
| Toggle camera flash | F or Flash toggle |
| Open lighting kit | L or Lighting button |
| Assignment board | Q |
| Photo journal | J |
| World map | M |
| Close dialog | Escape |

Select an assignment, explore or use **Find the spot**, and frame the marked subject. Adjust shutter, aperture, ISO, filters, and tripod. **Try suggested settings** provides a starting point for experimentation. Feedback evaluates the subject, exposure, and the lesson; try again freely. Assignment XP is earned only once. Photographs and progress save locally in this browser, with the latest 16 frames retained. Download favourites from the photo review.

To restart, open **How to play → Start a fresh notebook**. The current notebook is backed up on this device before the new one starts. **Restore previous notebook** restores that backup.

## Flash and studio practice

Open **Lighting** below the world. The **Camera flash** tab offers manual power from 1/64 to full. The ambient meter shows continuous light; the subject reading also includes flash. Flash exposure depends on power, distance, aperture, ISO, and filters. Within the 1/250 s sync limit, shutter speed changes the ambient exposure while the brief flash contribution stays constant. Above that limit the flash is suppressed with feedback; high-speed sync is not implemented.

Switch to **Studio lights**, visit the studio, and tune the key, fill, and rim lights. Each has an on/off switch, power, angle, distance, height, and colour. Balanced, dramatic, rim-light, and lights-off presets provide starting points. Adjustments update the actual 3D lights and stands live, and save on this device. Unlike a flash pulse, these continuous studio lights respond to shutter duration as well as aperture and ISO.

**Try a close flash portrait** sets up a nearby subject with the studio lamps off and 1/4 flash power. Compare it with flash off, then change shutter speed to explore the background/subject balance. The flash preview appears as a steady light for easy adjustments; photographs simulate a brief pulse. Captures record flash power and the studio rig in their journal entry.

## First milestone

- A small connected world with six photography locations, stylized lighting, shadows, animated water and a runner, and a night sky.
- Twelve playable prototype briefs: two each for nature, sports, news, wedding, studio, and astrophotography.
- Calculated exposure, filter attenuation, composition/distance/obstruction checks, and lesson-specific feedback.
- Manual flash with distance falloff and sync checking; adjustable continuous key, fill, and rim studio lights.
- Actual 3:2 image captures, simplified visual effects, photo review, downloads, and a persistent journal.
- A map, travel shortcuts, keyboard aiming, and a performance setting.

This is a foundation, not the finished game. Blur and background separation use image-space approximations, panning uses a switch, glass reflections are simulated, exposure durations resolve instantly, and star trails are illustrative. Studio softboxes use spot lights with shadows and inverse-square falloff; bounce lighting, true area-light shadows, flash duration/motion freezing, and high-speed sync are not simulated. The subject meter uses assignment light, distance, and a calibrated studio rig rather than integrating every surface, light angle, or obstruction; actual shading and shadows are rendered in the scene. The studio assignment reduces ambient scene lighting to make controlled lighting easier to see. NPC dialogue, staged events, focus simulation, audio, full collisions, and desktop packaging remain planned. Desktop keyboard/mouse is required for full exploration; responsive UI is not a complete mobile port.

See [the development plan](docs/PLAN.md) for the full curriculum, milestones, technical direction, and validation approach.

## Source layout

- `src/world.ts` — procedural scenery, lighting, subjects, and animation.
- `src/missions.ts` — assignment curriculum and suggested settings.
- `src/photography.ts` — pure exposure and assessment model.
- `src/lighting.ts` — flash exposure/sync, studio settings, and continuous-light metering.
- `src/main.ts` — exploration, camera interaction, captures, UI, and saves.
- `src/style.css` — responsive interface.

The production output is a static `dist/` directory. The prototype has no backend and has not been publicly deployed.

Browser playtesting can use `/?playtest=1` to keep test captures in a separate save from the player's notebook.

## License

MIT. See [LICENSE](LICENSE).

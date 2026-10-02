# The Photographer

A small open-world photography game prototype. Explore a warm, low-poly town and its surrounding hills, move home to be near your dying uncle, get to know the town through paid assignments, and learn from the photographs you make.

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
| Switch lenses / filters | LENS / FILTER dropdowns in the camera bar |
| Zoom (equipped purchased lens) | Scroll over the world, or − / + |
| Raise/lower viewfinder | E |
| Cycle framing grid (thirds / center / off) | G with the camera raised |
| Autofocus / manual focus (lock distance) | M or focus icon |
| Focus nearer / farther | [ / ] or viewfinder focus slider |
| Focus once (preserves manual lock) | Q or Focus once button |
| Talk to a nearby local | R or the on-screen prompt |
| Visit gallery / talk to Uncle Arthur | R at the gallery entrance / Arthur’s porch |
| Toggle sneak | C or Sneak button |
| Make a photograph | Space or shutter button |
| Slower / faster shutter | 1 / 2 |
| Wider / narrower aperture | 3 / 4 |
| Lower / higher ISO | 5 / 6 |
| Set/pack tripod | T or tripod icon |
| Toggle purchased flash | F or flash icon |
| Single / burst (purchased camera) | B or burst icon |
| Open lighting kit | L or Lighting button |
| Pause menu: Assignments, Inventory, Journal, Explore, Settings | Escape or Esc button |
| Open pause menu / dismiss messages and resume | Escape |

A fresh notebook opens with a skippable 34-second ferry approach along more than 210 metres of clear coastal channel. The shaped hull, wheelhouse, fenders, rails, mast and trailing wake replace the box boat. The camera previews Bracken Head Light and the northern observatory before revealing the town; captions leave the boat and landscape visible. Reduced motion starts at the berth. A letter from Uncle Arthur explains why you have come home. Mara directs you to Arthur’s porch. Sit with him first: he gives you the old analog camera he used as a photographer, because his illness now keeps him from using it. Accept it to unlock photography and the deer assignment. Both continuing and skipping with **Esc** leave you at the arrival dock. Follow the walking directions to Arthur first, then take the western trail past the chapel to find the deer. **C** toggles a slow, quiet sneak and lowers your viewpoint from 1.7 m to 1.05 m above the ground. Crouching and standing blend smoothly; reduced-motion mode switches instantly. Shift does not override sneaking. Walking within 18 metres or running within 28 metres startles the deer, while sneaking lets you approach to six metres. Getting too close still scares it. Back away and stay quiet to let it settle. The first wildlife photograph uses the starter kit and teaches framing, an undisturbed subject, and keeping six metres of space; completion unlocks travel shortcuts and the optional **Chasing the golden hour** lighthouse assignment. The main story asks you to print the deer at **Willowbrook Gallery**, then visit **Arthur’s porch**. Both are marked under Esc → Explore. Existing notebooks keep their progress and bypass the opening. Walk to locals with golden markers and press **R** (or click the talk prompt) to hear their stories. Their unlocked briefs are added to **Esc → Assignments**, where you can accept them later. Main story milestones open new disciplines and commissions. Explore by the creek, track, square, garden, studio, and northern ridge. **Esc → Assignments → Active → Guide me to the viewpoint** starts walking directions without moving you. Explicit **Travel** shortcuts are available in Explore for discovered, gear-ready assignments after the first deer photograph. Frame the marked subject. Adjust shutter, aperture, ISO, filters, and tripod. **Try suggested settings** provides a starting point for experimentation. Feedback evaluates the subject, exposure, and the lesson. Each saved analog photograph, including a failed attempt or replay, uses one exposure. Assignment XP and payment are earned only once. Photographs, your position, and progress save locally in this browser, with the latest 16 frames retained. Taking a photo shows a brief clickable preview without interrupting play. Open the preview or **Esc → Journal** for feedback and downloads.

Some assignments now need a **photo set**. Ruth’s workshop portrait pairs an establishing frame with a closer portrait from the west; the pottery brief pairs the whole vase with a closer oblique view. Select a required view in **Esc → Assignments**, then use **Guide me to the viewpoint** and **Suggested settings** for that view. Each must pass its own technique and perspective checks. Change position: zoom changes and repeated bursts do not fill another angle. The full set earns one payment and XP award. Accepted views survive reloads and journal eviction; existing completed notebooks keep their rewards. Completed sets can be revisited, and the gallery hangs one representative frame per assignment.

Saved photographs accumulate scene motion over the selected shutter interval: fast shutters freeze subjects, slow shutters soften flowing water and smear the runner. A tripod removes simulated handheld shake; Panning tracks the runner and lets the background streak. Motion blur appears in the photograph, while the live view remains responsive.

Exploration uses a **24 mm-equivalent field of view**, independent of your equipped lens or zoom. **E** raises or lowers the camera in a short animation and switches to the selected lens’s framing through the viewfinder. Reduced motion skips this transition. Saved photographs always use the selected lens, including when shooting with the camera lowered. The viewfinder previews depth of field. Autofocus follows the unobstructed assignment subject inside the 3:2 frame; when you aim away, it focuses on the center surface. The AF box and distance readout show the focus plane. Aperture, focal length, and focus distance affect foreground and background softness in every assignment. For obvious separation, try a longer lens and a closer subject at f/1.8–f/2.8; stop down for more depth. The journal retains the captured focus distance.

Press **M** to lock the current focus distance and switch to manual focus. The viewfinder’s **Lens focus** panel has a logarithmic distance slider from **0.7 m to infinity**, with finer control near the camera. Use **[ / ]** to focus nearer/farther, or **Q** to autofocus once while keeping manual mode. Recompose or move and the locked plane stays at the same distance from the camera; press M again to resume continuous autofocus. An amber dashed reticle and **Out of focus** cue warn when the assignment subject is too soft. Captures assess focus using the same thin-lens blur as the renderer, with guidance for missed focus. Manual burst frames share the locked distance; autofocus reacquires each frame. Focus mode and distance survive reloads, and the journal records AF/MF with each photograph. Suggested settings restore autofocus.

Choose **Guide me to the viewpoint** in Assignments, or **Walk** beside a destination in Explore, to get directions on foot. A small arrow shows the next turn and remaining walking distance; Explore draws the route in dashed green. Routes use the same building, water and coastline restrictions as walking, and rebuild if you detour behind an obstacle. Photo sets lead to the selected view. Directions work during the opening walk, save across reloads, and hide while photographing or talking. Arrival clears the cue; its **×** button or **Stop directions** on the map cancels it. Travel shortcuts remain separate and unlock after the deer photograph.

The Esc menu has **Assignments**, **Inventory**, **Journal**, **Gallery**, **Keepsakes**, **Explore**, and **Settings** tabs. Assignments are separated into **Active**, **Available**, and **Completed**, with paid replays clearly marked. Explore contains the map, meditation, and lighting kit; Settings contains sound, graphics, controls, and notebook backup/restore. Arrow keys navigate the main tabs, and Esc resumes from any main tab or returns from a detail page.

Menus show actions and essential status first. Tap an **ⓘ** icon or its heading to reveal briefs, field notes, settings help, gallery rules, or keepsake stories. Only one explanation opens at a time. Enter or Space also toggles a focused info heading; **Esc** closes the explanation before resuming the game. Available assignments have separate **Accept assignment** buttons, so reading a brief does not select it. The active assignment and its controls appear before story summaries. Photo reviews keep missed-check advice visible and fold successful-check explanations away.

**Esc → Settings** also offers rule-of-thirds, center-cross, or no framing grid and a **50–150% look sensitivity** slider. Press **G** with the camera raised to cycle grids. Guides appear only in the viewfinder; saved photographs stay clear. Graphics quality, grid, and sensitivity save with the notebook, along with shutter, aperture, ISO, panning, and your aiming direction. The tripod starts packed on reload. Older notebooks keep their progress and use the existing default controls. Leaving the game window or hiding its tab opens the pause menu, stops movement and encounters, and interrupts meditation at the current time. Return and choose **Resume**; time spent away never advances the world. On compact screens, the seven pause tabs use two rows; Up/Down moves between rows and Left/Right between tabs.

Exploration keeps the HUD quiet; camera settings and equipment appear only while the camera is raised. On touch devices and compact screens, drag the thumb pad to walk, release to stop, and drag the scene with another finger to look around. A small sneak button slows your approach. Touch walking controls disappear while the camera is raised, in menus, during the introduction or meditation, and while the tripod locks movement. Shortcuts work while playing; focused dropdowns keep their normal keyboard behavior. Without a tripod, the camera has a tiny handheld wobble, softened at long focal lengths for precise aiming. **T** unfolds the tripod in 0.42 seconds and packs it in 0.28 seconds; the wobble smoothly settles during setup and returns during packing. Movement and capture are blocked during the transition, and movement remains locked while deployed. Reduced-motion preferences disable the wobble and skip the animation.

To restart, open **Esc → Settings → Manage notebook → Start a fresh notebook**. The current notebook is backed up on this device before the new one starts. **Restore previous notebook** restores that backup.

## Arthur’s story, the gallery, and a home

You have moved to Willowbrook because Uncle Arthur is dying. His wish is a photograph of the rare pale bear he remembers from the northern woods. The starter lens cannot reach it safely; becoming the town’s photographer pays for the equipment you need.

The main story runs through **deer → free gallery print → Arthur’s porch → wedding portrait → wedding group → newspaper sports commission → secret town-hall meeting → woodland boundary photograph → deliver both pictures to June → bear photograph → free bear print → Arthur’s porch**. Esc → Assignments always shows the current chapter and a **Continue the story** button. The final visit is about time together and reconciliation; you can keep exploring afterward. Visit Arthur between assignments for three optional, saved conversations about your first camera, the northern path, and his bear sighting. His porch has a dedicated seated model, a lap blanket, spectacles, tea things, and a second chair. There is no illness countdown.

The pale bear is dangerous at every story stage. Inside **20 m**, it turns toward you and warns; retreat within **2.5 seconds** to avoid a charge. Approaching within **10 m** triggers an immediate charge, even while sneaking. It pursues at 6.3 m/s, so **Shift + WASD** can outrun it. Close contact causes a bite at most once every **1.5 seconds**, with trembling, a red vignette and a visible bite count. After **four bites**, you black out and wake fully recovered beside a bed in **Willowbrook Hospital**, east of the neighborhood. You can walk out and continue; photographs, gear, money and story progress survive. Injury counts save between visits and reset after 20 seconds safely away. The bear stops pursuing beyond its clearing and returns home. Reduced motion removes camera shake. Esc menus pause the encounter; shutter samples never advance damage.

**Harbor stories** adds an optional thread at **Tidewright Workshop**, south of the neighborhood on the lane to the ferry. After showing Arthur the deer print, meet **Ruth** with **R**. Her **$120 environmental portrait** asks you to include her and the unfinished boat. Ruth needs reliable deliveries and cares about the woodland path; her story gives the road proposal another human perspective. After that portrait and June’s report, the **$160 crew photograph** includes Ruth and apprentices **Nessa and Kit** with the boat. Both briefs use the starter 35 mm lens, f/8 or smaller, and 1/125 s or faster. Assessment checks the actual saved sensor crop and clear sightlines to the people and the boat, rather than accepting a tight headshot. Print both pictures at the gallery, then return to Ruth to check names and captions before sharing them with June. The newspaper, workshop board and Arthur’s dialogue respond. The crew’s delivery bay is a suggestion for the hearing that still needs costing and an access study. Esc → Assignments tracks this thread alongside Arthur’s main story; it remains available after the bear ending. The workshop has rounded character models, work aprons, tools, a ribbed open boat hull, timber racks and a connected walking route from the houses to the ferry.

The studio side jobs open after showing Arthur the deer print. Finishing the wedding opens the creek and astronomy briefs; the race opens the paper’s other jobs, panning, and the kingfisher assignment. Talk to locals to discover these paid side jobs. Existing notebooks keep their earlier discoveries and payments.

**Behind closed doors** needs the **$90 CPL**, no flash, and **22:00–02:00** light. Vale and the developer appear behind the town hall’s reflective window at night with papers on the desk. Suggested settings start at 1/125 s, f/2.8, ISO 6400; use meditation to wait for the meeting. June asks for context before drawing conclusions. **The line on the map** adds a $140 documentary assignment on the northern ridge trail: photograph the woodland survey notice with the path and its surroundings, using f/8 or smaller. Then use **Continue the story → Find June in the square**, press **R**, and leave both photographs with her. Her reporting prompts a public hearing and pauses the proposed road. The physical newspaper board in the square and the woodland planning notice change, and the locals respond to your work. The newspaper board is readable with R and marked in Explore. Earlier notebooks that had already finished the meeting keep their bear route.

**One last wild thing** requires buying and equipping the **$480 200–600 mm lens**, a shutter of 1/500 s or faster, no flash, and at least **20 m** of space. The northern overlook provides a clear view. The wedding, race, meeting, and woodland boundary together pay $900, enough for the CPL and wildlife lens with money left for prints and rent. Side jobs provide more flexibility if you buy other equipment first.

Visit the open-front gallery beside the wedding garden and press **R** to print and hang a successful photograph. Each story occupies one exhibition slot, so burst frames and replays cannot multiply the income. Ordinary prints cost **$5**; the deer and bear prints are free. Prints remain saved in the gallery after their photos leave the journal. The gallery has twenty-three physical frames, and the Gallery tab lets you see the collection from anywhere.

Once **five different successful photographs** are on the wall, open a paid exhibition at the gallery. It earns **$5 per game day**, starting at the next midnight. Your town room costs **$2 per game day**, beginning after showing Arthur your deer print. If funds run short, rent waits as arrears while you keep photographing. Buy the **$350 garden cottage** from Arthur’s porch, clearing any rent arrears at the same time; ownership removes future rent. Both homes are marked on the map.

Income and rent settle at game midnight, including when meditation crosses it. Menus pause time, and there are no charges or earnings while the game is closed. The Gallery tab shows the day, wallet, income, printing costs, housing, and waiting rent. For the full new opening, use **Esc → Settings → Manage notebook → Start a fresh notebook**; your current notebook is backed up first. See [the story design](docs/STORY.md) for the implemented progression and prototype limits.

## Hidden keepsakes

Thirty different keepsakes are tucked around the shore, town, meadow, woods and four outer landmarks. Each has its own physical model and a short piece of local history. Lower your camera and press **R** when the nearby collection prompt appears. A subtle glint is visible only at short range; the map does not reveal hiding places.

**Esc → Keepsakes** tracks finds separately from missions, with unidentified entries remaining hidden. Finding all thirty delivers an invitation to tea and stories from **Elspeth**, the local historian beside the gallery. Visit her and accept the **Willowbrook heritage compass**, an engraved brass compass kept permanently in the collection. Finds, the invitation and the received gift survive reloads and notebook backups; a fresh notebook clears them. This optional collection grants no mission completion, money, XP or story unlocks.

The development-only `/tests/collectibles-playtest.html` provides first-find, final-find and historian reward scenarios in an isolated `keepsakes` notebook.

## Mission payments and gear

Successful assignments pay **$120–$260**, once per brief. Failed attempts cost nothing; repeating a completed brief still saves the photo but earns no extra cash. Visit **Willowbrook Camera Co.**, just south of the track, and press **R** at the storefront to spend your earnings. **Esc → Explore** marks the store and offers a travel shortcut:

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

The starter kit includes a fixed 35 mm lens, tripod, and studio lights. Filters are separate purchases. New notebooks can fund any first filter with the lighthouse’s $120 payment; filter-free sports, wedding, studio, and astro briefs also earn money. Existing notebooks retain their previously included ND64 and CPL at no charge. Five briefs (lighthouse, creek, freezing the runner, morning baker, and studio portrait) pay $740: enough for ND64, CPL, and the wildlife lens with $95 left over, without repeating a mission. Purchases take effect immediately and save with the notebook. Choose your equipped lens in the **LENS** dropdown beside **FILTER**; each has its own focal range, and the equipped lens and focal length persist.

A burst samples the moving world between frames, keeps every frame in the journal, and previews the highest-scoring frame. Camera settings stay fixed during the sequence; you can keep aiming. Completed missions from older notebooks receive back pay, and a flash already used in those notebooks is kept for free. Starting a fresh notebook also resets money and purchases; its backup preserves them.

## Trails, locals, and bird photography

The world is **520 m across**, with four times the previous 260 m map’s area. Walk the rolling woodland and meadow trails, climb the northern ridge, or visit the eastern wetland. Player height follows the ground. The town remains level for its existing studio, track and garden scenarios. Characters now have shaped bodies, facial features, hands, clothing details and varied skin tones; locals carry field bags and distinctive accessories. Trees and ground cover are instanced and static detail is batched to limit draw calls.

Four large landmarks anchor the outer country: **Bracken Head Light** on the western headland, **Northstar Observatory** in the northern heights, **Hollowstone Viaduct** across the eastern valley, and **Briar Hill Windmill** above the eastern shore. Connected pale trails reach their public viewpoints and history boards. The viaduct has five open masonry arches and an abandoned railway; the observatory has a ribbed dome and observation slit; the windmill has slowly turning sails. Trees and ground cover fill the larger region with instanced meshes, and landmark detail is batched by material.

After showing Arthur the deer print, **Arthur’s four horizons** opens four optional $100 landscape commissions together. His old postcards connect each place to the family and town. Make a landscape at f/8 or smaller, print it at the gallery, and return to his porch. The album counts saved prints, keeps its progress after photographs leave the journal, and has a new conversation when all four are home. Press **R** at each history board to read its story; the same histories are accessible from Arthur’s album. These journeys stay available alongside the main bear story and after its ending. **Explore → Town detail** enlarges the familiar town; **Whole region** shows the outer trails and landmarks.

The development-only [four horizons playtest](tests/landmark-playtest.html) provides an isolated ferry replay, landmark viewpoints and completed-album fixture, using only the `four-horizons` notebook.

Mara, the creek ranger, introduces **A flash of blue** alongside the waterfall story. Buy the **$480 wildlife lens** and accept the bird assignment from your notebook. Photograph the kingfisher on its wetland perch from the trail or hide, about 20–35 m away. Use **400–600 mm**, **1/1000 s or faster**, **f/5.6 or smaller**, and stay at least **18 m away**. Suggested settings equip the wildlife lens at 600 mm and set ISO 800. The photograph must show a close-up as well as meet the exposure and technique checks; it pays **$260** once. Aim sensitivity slows at long focal lengths for finer framing.

Mission discovery and story progress save with the notebook. Existing saves retain completed, photographed, and previously active briefs; other stories are found through locals after their story milestones. To experience the one-mission introduction, use **Esc → Settings → Manage notebook → Start a fresh notebook**, which backs up the current notebook first.

## Sky, time, and meditation

One 24-hour day takes **30 minutes of active play**. Menus and hidden tabs pause the clock; your saved world time resumes when you return. Sun and moon positions, shadow direction, sky and fog colours, stars, and outdoor exposure change with time. Twelve drifting blocky clouds use one instanced draw call; a repeating cloud-cover pattern gently attenuates sunlight. Clouds are stylized meshes, with approximate coverage and broad light attenuation rather than volumetric weather or individual cloud shadows.

Use **Esc → Explore → Meditate** to skip forward with a brief sky transition to dawn, daylight, golden hour, night, or **For this assignment**. Reduced-motion preferences skip the transition; Esc interrupts meditation at the current time. Your location and camera settings stay in place.

Five briefs require particular light:

| Assignment | Time window |
| --- | --- |
| Chasing the golden hour | 16:30–18:00 |
| Through the glass | 06:00–09:00 |
| The evening edition | 18:00–20:00 |
| Both astro assignments | 21:00–04:00 |

Accepting an assignment or travelling preserves the clock. Suggested settings are calibrated for its preferred time; watch the meter as daylight changes. Other briefs accept any time, though outdoor exposure still matters. Controlled studio metering stays independent of the outdoor clock. Captures record their time and cloud cover; older notebook entries remain readable.

## Flash and studio practice

Press **L**, click the lighting icon, or open **Esc → Explore → Lighting kit**. After buying the flash, the **Camera flash** tab offers manual power from 1/64 to full. The ambient meter shows continuous light; the subject reading also includes flash. Flash exposure depends on power, distance, aperture, ISO, and filters. Within the 1/250 s sync limit, shutter speed changes the ambient exposure while the brief flash contribution stays constant. Above that limit the flash is suppressed with feedback; high-speed sync is not implemented.

Near **Daylight Studio**, the **Studio lights** tab becomes available so you can tune the key, fill, and rim lights. Moving away hides these controls and switches an open lighting kit back to camera flash; flash controls remain available everywhere. Each has an on/off switch, power, angle, distance, height, and colour. Balanced, dramatic, rim-light, and lights-off presets provide starting points. Adjustments update the actual 3D lights and stands live, and save on this device. Unlike a flash pulse, these continuous studio lights respond to shutter duration as well as aperture and ISO.

**Try a close flash portrait**, available after buying the flash, sets up a nearby subject with the studio lamps off and 1/4 flash power. Compare it with flash off, then change shutter speed to explore the background/subject balance. The flash preview appears as a steady light for easy adjustments; photographs simulate a brief pulse. Captures record flash power and the studio rig in their journal entry.

## Filters and reflections

Visit the camera store and press **R** to buy a filter. Buying fits it immediately; owned filters have **Fit filter / Remove filter** buttons. The FILTER dropdown switches among owned filters; unowned filters are sold at the camera store. One filter is fitted at a time, and ownership, the fitted filter, and graduated transition height survive reloads.

ND16, ND32, and ND64 attenuate both ambient and flash by four, five, and six stops. All three work for the creek assignment when you balance exposure. Suggested settings adapt to an owned ND: ND16 uses 1/4 s at f/11, ND32 uses 1/2 s at f/11, and ND64 uses 1/2 s at f/8, all at ISO 100. Missing required filters point you to the camera store. Purchases require visiting the storefront.

The soft graduated ND8 darkens the top by three stops and leaves the bottom clear. Fit it to raise the viewfinder, then move **GND transition** to align the soft band with your horizon. The slider previews changes live. Center metering and subject feedback account for attenuation at their position in the 3:2 crop; the saved photograph applies the same gradient to ambient and flash before motion accumulation and tone mapping. A graduated filter does not replace a uniform ND for the creek lesson.

The bakery window reflects actual scenery using a planar reflection. A CPL reduces the reflected contribution to one tenth while retaining the glass tint, making the baker easier to see. Compensate for its one-stop light loss with shutter, aperture, or ISO. Polarizer rotation and fully physical angle-dependent suppression remain future work.

The lake and wetland now have translucent water, animated rippled reflections, shallow basins, and 23 swimming fish. Look down beside the jetty to see a nearby school, or explore the lake edges and bird pond. A CPL suppresses surface glare and makes the fish and lakebed clearer. The schools swim continuously with moving tails; fast shutters freeze them and longer exposures record their movement. Reflection strength increases at shallow viewing angles. Water remains a stylized surface rather than a fluid or refraction simulation.

Fern Creek drops over a roughly nine-metre cliff of layered crags, mossy ledges, and firs. The falling curtain spills into a plunge pool with spray and expanding ripples, then a winding river carries foam into Willow Lake through an opening in the western shore. The creek assignment’s viewpoint frames the enlarged cliff and river. Fast shutters retain whitewater detail; the suggested half-second ND64 tripod exposure softens the flow while keeping the rock faces sharp. The river and cliff restrict walking, with dry banks available for exploration.

## A living Willowbrook

Town houses have pitched gabled roofs, tiled roof surfaces, timber grain and board seams, stone foundations, pale roof trim, ridge caps, chimney pots, and framed crossbar windows with deep panes, curtain detail and projecting sills. Window interiors glow warmly after dusk. Terrain, gravel paths, asphalt and metre-wide paving slabs have subtle surface textures at a consistent world scale, and trail shoulders blend into the grass. These small material textures are generated locally and mipmapped for distant views. Building details are batched by material; map-wide trees, shrubs, grass and scattered ground details use spatial batches so offscreen areas can be culled without removing vegetation.

Balanced graphics refreshes planar reflections roughly 30 times per second on desktop and 15 times per second on touch devices, while water ripples continue every frame. Touch rendering is capped at 1.25× device resolution. Performance uses 1× resolution, disables shadows and refreshes reflections roughly 10 times per second. Each saved shutter sample refreshes its reflections independently, preserving moving water, fish and CPL behavior in photographs. Daytime lamps and disabled equipment no longer participate in every lit surface shader; studio spotlights have a bounded 24-metre range. Autofocus filters objects by visibility and ray bounds, searches nearest candidates first, and tests the terrain through small tiles of its exact triangles. Close-up grass remains focusable. The development scenery page at `/tests/living-world.html` compares views, toggles grass and wide/telephoto lenses, and measures submitted work plus CPU/GPU render timings, including reflection and shadow passes. GPU timings are optional when the browser supports timer queries.

Six story locals now walk short, dry routes and pause to look around. Most are out from 07:00 to 21:00; Ida patrols the ridge from 18:00 to 06:00. Off-duty locals remain available for a quiet chat at their familiar meeting places. Their gold markers, proximity prompts, and discovered map markers follow their actual positions. Portrait subjects keep their assignment locations, with idle arm motion and more varied appearances. Characters have different builds, heights, skin tones, hair, trousers, dresses, scarves, glasses, hats, bags and work aprons.

The scenery has a continuous sky gradient and sun halo, rounded clouds that catch the light, smoother hills, varied tree foliage, and timber siding, foundations and doorsteps on houses. The sun rises in the east (+X), passes through the southern sky and sets in the west (−X). Sun and moon render in the distant sky with stable angular size and position throughout the enlarged map; their light sources and the sun halo follow the same orbit. Meadows and woodland edges contain 19,500 wind-swept grass tufts in 24-metre tiles, shrubs and six patches of petalled wildflowers. Grass is dense nearby, thins with distance and fades into the ground surface; narrow lenses retain detail farther away. Each render camera selects its own detail, including reflections and saved photographs. Grass uses opaque blades with dithered transitions and receives shadows without casting them. Thirteen rabbits hop and pause to graze; 22 inland birds circle in two flocks, 16 butterflies flutter around the gardens, and fireflies gather beside the lake after dusk. Daytime wildlife rests at night. Every person has independent breathing, gentle head turns and posture changes, including Arthur, the harbor crew and Mara during the arrival. Standing characters add occasional arm gestures. Animation uses absolute time so long exposures capture movement and restore the live scene exactly.

The southern neighborhood adds eight houses, rounded streets, sidewalks, a crosswalk, a shelter and lamps. Eight residents—including smaller and older-looking characters—walk the pavements with a dog. Three slow vehicles circulate by day; two park in driveways after 21:00, while the delivery van runs until midnight. Vehicles restrict walking and obstruct photographs only while their visible meshes are present. Street lights, home windows, chapel lighting and headlights come on at dusk.

Five ducks paddle on the lake and settle near the bank at night. Two deer wander and graze in the western meadow, a fox comes out in the eastern woodland after 19:00, and six gulls circle the southern coast. Routines and animation sample absolute time, so motion accumulation can photograph them and restore the scene precisely afterward.

Willowbrook Gallery now sits inland west of Fern Creek in a 12 × 12 m exhibition room with 24 frame spaces. Opening a paid exhibition brings in five visitors; each extra print adds another visitor, up to twelve. A varied visitor roster changes each game day. Visitors face the exhibited photographs, show occasional comments, and discuss a specific print when approached with **R**. The daily exhibition income remains $5. Elspeth walks beside the new gallery.

The hospital and Arthur’s house are farther inland on graded sites, with foundations and level entrances. Other central buildings have level footprints, and the approaches blend into the surrounding hills. The wedding arch, flower borders and portrait subjects now face down the aisle from the chapel, with updated assignment viewpoints.

Fernwood trail cabin and Birch Hollow cabin add open shelters, beds, woodpiles, seats and readable trail guestbooks to the outer woods. Find both in **Explore** and follow their connecting paths. Two more deer graze near Fernwood, a second fox visits Birch Hollow from dusk through dawn, and six more rabbits populate the outer woods. These visits are optional and remain available alongside the main story. The development-only `/tests/island-playtest.html` supplies isolated exhibition, visitor conversation, porch, hospital and cabin fixtures in the `island-layout` notebook.

A walkable chapel beside the wedding garden has pews, an altar, stained windows and a bell tower. The south edge of the map opens onto an ocean with a sandy beach, rolling foam, coastal rocks, driftwood and an overlook bench. Follow the path from the neighborhood to the shore. **Esc → Explore** also has shortcuts to the chapel, neighborhood and beach overlook.

Audio is synthesized in the browser: wind, running water near the creek, surf near the coast, daytime bird calls, nighttime insects, passing engines, footsteps, shutter clicks and nearby chapel bells at 08:00, 12:00 and 18:00. Speaking characters have distinct, gentle nonverbal voices: vowel-like murmurs with pitch variation and pauses between phrases. These accompany the introduction, local conversations and Arthur’s memories in short passages of up to eight seconds; the full dialogue remains readable immediately. Wind and surf use softer layered noise, and footsteps vary in tone, weight and left/right placement. Your first click or key press unlocks audio. **Esc → Settings** offers mute and volume controls for all sound, saved with the notebook. World sounds fade out in menus and meditation; conversation voices remain audible in their dialogue pages. Voices stop when you leave or replace a conversation, and all sound fades out in hidden tabs and when the window loses focus.

These are lightweight procedural routines. Residents and wildlife use clock-based activity windows rather than a needs or event simulation; traffic is ambient, not drivable. Ocean surf and animal models are stylized, and sound is synthesized rather than recorded.

## First milestone

- A connected town with six original photography locations, rolling hills, woodland and meadow trails, and a bird wetland, stylized lighting, shadows, animated water and a runner, a moving sun and moon, drifting clouds, and a 30-minute day/night cycle.
- Twenty-three playable briefs across six disciplines, including the deer introduction, woodland investigation, bear story, and four regional landscapes. Six locals reveal further commissions through dialogue.
- Calculated exposure, filter attenuation, composition/distance/obstruction checks, and lesson-specific feedback.
- Manual flash with distance falloff and sync checking; adjustable continuous key, fill, and rim studio lights.
- Mission payments, a gear shop, unlockable zoom and wildlife lenses, a flash and burst camera, and three-frame sports bursts.
- Actual 3:2 image captures, simplified visual effects, photo review, downloads, and a persistent journal.
- A map, travel shortcuts, keyboard aiming, and a performance setting.

This is a foundation, not the finished game. Motion blur accumulates up to 33 scene samples over the selected shutter interval, with simulated handheld shake, runner tracking, flowing water, and a brief flash pulse. Long exposures render immediately rather than waiting for the shutter duration. Depth of field uses scene depth and a thin-lens blur radius, with a bounded disk kernel; transparent surfaces and blur around silhouettes remain approximations. Panning uses a switch, window reflections render the surrounding scene with simplified polarizer suppression, and star motion follows a simplified sky rotation. Studio softboxes use spot lights with shadows and inverse-square falloff; bounce lighting, true area-light shadows, variable flash duration, and high-speed sync are not simulated. The subject meter uses assignment light, distance, and a calibrated studio rig rather than integrating every surface, light angle, or obstruction; actual shading and shadows are rendered in the scene. The studio assignment reduces ambient scene lighting to make controlled lighting easier to see. Focus assessment checks the assignment’s central subject plane; it does not measure every face or the whole landscape. Deeper NPC stories, staged events, fuller collisions, and desktop packaging remain planned. Touch walking, drag-to-look, and camera buttons support mobile exploration; the prototype remains optimized for desktop graphics and is not yet a complete mobile port.

See [the development plan](docs/PLAN.md) for the full curriculum, milestones, technical direction, and validation approach.

## Source layout

- `src/life.ts` / `src/world-life.ts` — scheduled routines, road routes, residents, traffic and wildlife.
- `src/audio.ts` — gesture-unlocked ambience, effects, dialogue playback and shared sound controls.
- `src/speech.ts` — character voice profiles, deterministic phrasing and vowel-shaped speech synthesis.
- `tests/audio.html` — development-only voice auditions and offline Web Audio waveform/cancellation checks.
- `src/church.ts` / `src/coast.ts` — wedding chapel, ocean, surf and coastal scenery.
- `src/world.ts` — procedural scenery, lighting, subjects, and animation.
- `src/missions.ts` — assignment curriculum and suggested settings.
- `src/photography.ts` — pure exposure and assessment model.
- `src/optics.ts` / `src/depth-of-field.ts` — thin-lens math and shared scene-depth blur for the live viewfinder and saved photographs.
- `src/focus.ts` — persistent AF/MF state, logarithmic focus ring, and subject sharpness assessment.
- `tests/rendering.html` — development-only GPU checks; run the dev server and visit `/tests/rendering.html`. The optional notebook fixture uses a separate playtest save.
- `src/filters.ts` — filter catalog, strengths, labels, and graduated attenuation.
- `src/lighting.ts` — flash exposure/sync, studio settings, and continuous-light metering.
- `src/environment.ts` — world clock, sky/weather sampling, assignment time windows, and outdoor metering.
- `src/exploration.ts` — locals, mission discovery, proximity, and equipment gates.
- `src/collectibles.ts` / `src/collectible-world.ts` — thirty optional keepsakes, collection saves, unique models and historian reward.
- `src/navigation.ts` — collision-aware walking routes, distances, and camera-relative bearings.
- `src/terrain.ts` — world bounds, rolling elevation, and trail routes.
- `src/economy.ts` — mission payments, gear ownership, save migration, focal range, and burst timing.
- `src/controls.ts` — camera shortcuts and tripod transition state.
- `src/touch-controls.ts` — thumb walking, gradual speed, and independent touch tracking.
- `src/tripod.ts` — lightweight first-person tripod animation, excluded from captures.
- `src/notebook.ts` — disjoint mission status lists.
- `src/photo-series.ts` — required views, perspective assessment, persistent receipts and full-set completion.
- `src/camera-store.ts` — town storefront, collision, and purchase proximity.
- `src/opening.ts` / `src/arrival-route.ts` — longer scenic ferry arrival, shared clear shipping channel, camera reveal, and arrival dock.
- `src/landmarks.ts` / `src/landmark-world.ts` — four regional landmarks, histories, viewpoints and animated scenery.
- `src/wildlife.ts` — quiet movement, deer awareness, escape routes, and recovery.
- `src/camera-view.ts` — wide exploration view and camera raise/lower transition.
- `src/main.ts` — exploration, camera interaction, captures, UI, and saves.
- `src/style.css` — responsive interface.

The production output is a static `dist/` directory. The prototype has no backend and has not been publicly deployed.

Browser playtesting can use `/?playtest=1` or a named notebook such as `/?playtest=gear-progression` to keep test captures in a separate save from the player's notebook.

## License

MIT. See [LICENSE](LICENSE).

Arthur’s camera comes with a free **24-exposure roll** and pauses **0.9 seconds** to wind on between shots. Buy **$12** rolls at Willowbrook Camera Co. A roll loads immediately if the camera is empty; otherwise it becomes an unopened spare. If money runs out and no shots or spares remain, the shop offers a roll on a tab; future commissions or exhibition income repay the tab before spending. Unspent frames, film costs, and the handoff persist through reload and notebook backups. Existing notebooks keep their camera and receive a starter roll. The **$360 digital burst camera** removes film use and winding in both single and burst mode. Exposure settings and instant photo feedback remain available for learning.

You start with **$20**. Existing notebooks receive the same one-time credit; refreshing or restoring does not refill money already spent. The top-left HUD shows your wallet, shots remaining on the loaded roll, and unopened spare rolls while walking or photographing. It hides for the ferry and conversations. Click it or choose **Esc → Inventory** to see your camera, film, owned equipment and keepsakes link. Empty rolls can be replaced from your spares through **Load spare roll** in the HUD or Inventory. Loading spends one spare and keeps the wallet unchanged. Inventory also equips owned lenses and filters and switches digital burst mode.

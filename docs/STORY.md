# Arthur’s story

The player moves to Willowbrook to be near a dying uncle, Arthur. His remembered sighting of a rare pale bear provides the reason to learn, earn, and eventually return with something personal. Photography builds relationships in town; it is also the means of making a life there.

## Implemented main story

| Chapter | Player objective | Result |
| --- | --- | --- |
| Coming home | Photograph the calm meadow deer with the starter camera | Travel shortcuts and the optional lighthouse side job open |
| Something worth showing | Print and hang the deer at the gallery, then visit Arthur | Arthur is impressed; Alma offers the wedding commission; studio side jobs open |
| A familiar face | Photograph the newlyweds, then the family | The wedding earns $320; June asks for sports coverage; creek and astronomy side jobs open |
| The town takes notice | Photograph the runner for June’s paper | Earn $160; June trusts the player with her tip; more paper, sports and bird side jobs open |
| Behind closed doors | Photograph Vale, a developer and documents through the town hall window at night | Earn $280; June asks for context; the woodland boundary assignment opens |
| The line on the map | Photograph the woodland survey notice and its surroundings; bring both pictures to June | Earn $140; June checks the public register and seeks Vale’s response; reporting prompts an open hearing and pauses the proposed road |
| One last wild thing | Buy the telephoto lens and photograph the pale bear from the overlook | Preserve the bear’s freedom and fulfill Arthur’s wish |
| Time together | Print the bear and visit Arthur | A quiet reconciliation; the world, gallery and side jobs remain playable |

The Assignments page presents the current chapter. First completions of main assignments open the next story scene; completed replays keep their usual photo preview and do not reopen those scenes or award money. New main assignments are automatically discovered at their chapter. Locals reveal side assignments only after the associated story milestones. Previously discovered assignments remain available in migrated notebooks.

The bear is mentioned in the opening but cannot be pursued as a main assignment until the newspaper chapter is resolved. New notebooks require the boundary photograph and an explicit in-person handoff to June; taking either photograph alone does not finish the investigation. Completed assignments retain the evidence even if the original photographs leave the sixteen-frame journal. Notebooks from before this expansion that had already completed the town-hall meeting keep their bear route through repeated reloads. It also requires owned and equipped telephoto gear, at least 20 metres of space, adequate subject scale, a fast shutter, and no flash. The meeting requires a CPL, no flash, a steady shutter, useful exposure, and the overnight 22:00–02:00 window. The window uses the same planar reflection and polarizer suppression as the bakery.

## Making a living

Successful photographs can be printed at the gallery entrance. Printing and hanging are one interaction. Ordinary prints cost $5. The deer and bear prints cost nothing, so either story delivery remains possible with an empty wallet. Each mission has one saved print; different burst frames or replays do not increase the exhibition count. Gallery prints retain their image independently of the sixteen-photo journal.

Five distinct prints allow an exhibition to open. An active exhibition earns $5 at each future game midnight. The starting room costs $2 per game day after the first successful visit to Arthur. Insufficient funds accumulate waiting rent without taking the wallet below zero or blocking assignments. Midnight pays the exhibition before settling rent and arrears. A $350 cottage purchase clears arrears and stops future rent. Gear, prints, home purchase, rent and exhibition earnings share the same wallet and persist through reload and notebook backup/restore.

One day remains thirty minutes of active play. Meditation advances the calendar and finances; menus and closed/hidden tabs do not. Income and expenses are based on game time, with no real-world offline accrual. Day counting, prints, story flags, exhibition state and housing save with the existing notebook.

The main paid commissions total $900, covering the $90 CPL and $480 wildlife lens. Studio, landscape, water, sports, newspaper, bird and astronomy side jobs offer additional earnings and subjects for the gallery. The gallery supplies modest continuing income after those one-time commissions.

## Prototype boundaries

The story uses captioned dialogue and notebook scenes. The new places, bear and gallery are procedural low-poly scenery. Arthur has a porch interaction; housing ownership changes finances and identifies a home on the map, without adding home interiors or furnishing systems. Arthur has a dedicated rounded seated model with spectacles, cardigan and lap blanket. His porch includes a second chair and tea table; character meshes are merged by material. Three optional conversations recall the player’s first camera, the family’s work on the northern path, and Arthur’s bear sighting. Read memories persist without unlocking commissions or advancing time. The final visit acknowledges the years both people let pass and is a written quiet scene, without voice acting, a death countdown, funeral, or branching endings. The town hall assignment depicts an exchange of papers. The player follows it with a documentary photograph of a real survey notice and ribboned stakes on the northern trail, then hands the evidence to June. Record checking and the council’s response use a written scene. The outcome is a pause and an open hearing, not proof of corruption or cancellation of the proposal. The physical newspaper board and survey notice update, and June, Mara, Theo, Alma, and Arthur have milestone-dependent dialogue. The existing public path stays walkable. Income is a daily exhibition payment rather than simulated individual ticket sales.

## Verification

All 123 automated tests pass. Story tests cover the chapter chain, printing and return visits, gated side jobs, legacy discovery, distinct exhibition subjects, daily income/rent/arrears, housing and purchase persistence, bear safety and gear, overnight window photography, gallery/porch/newspaper/boundary access, investigation delivery and save migration, memory persistence, and deterministic bear motion. The development-only `tests/story-playtest.html` fixture prepares the isolated `story-review` notebook for an actual deer capture, leaving the normal player notebook untouched.

The development-only `tests/story-expansion.html` fixture prepares the isolated `story-expansion` notebook for the woodland photograph, June handoff, or Arthur’s porch. Browser verification completed a real boundary capture at 100/100 with its $140 reward, delivered the photographs to June, reloaded into the bear chapter, inspected the changed physical newspaper, and read a saved Arthur memory. Normal player progress is untouched.

// Optional local history: no assignment, story gate, payment or XP depends on this collection.
export const keepsakes = [
  { id: 'ferry-token', name: 'Old ferry token', region: 'Arrival shore', x: 15, z: 89, story: 'Before tickets, the ferry keeper counted these brass tokens into a wooden tray.' },
  { id: 'shell', name: 'Striped scallop shell', region: 'Arrival shore', x: 60, z: 91, story: 'Children traded striped shells while their parents waited for the tide.' },
  { id: 'boat-cleat', name: 'Carved boat cleat', region: 'Harbor', x: 35, z: 88, story: 'A hand-carved practice piece from the harbor’s first apprentice class.' },
  { id: 'bottle', name: 'Sea-glass bottle', region: 'Harbor', x: 51, z: 79, story: 'The workshop kept linseed oil in green glass long before plastic arrived.' },
  { id: 'rope', name: 'Sailor’s knot', region: 'Harbor', x: 26, z: 90, story: 'This small coil holds a bowline, the first knot taught to new ferry hands.' },
  { id: 'key', name: 'Chapel key', region: 'Town', x: -47, z: 32, story: 'A retired key to the chapel vestry, worn smooth by generations of caretakers.' },
  { id: 'ribbon', name: 'Festival ribbon', region: 'Town', x: -30, z: 23, story: 'The garden’s summer fair once awarded these blue ribbons for homemade jam.' },
  { id: 'thimble', name: 'Tailor’s thimble', region: 'Town', x: -16, z: 34, story: 'The wedding tailor used a silver thimble to finish every jacket by hand.' },
  { id: 'button', name: 'Enamel coat button', region: 'Town', x: 10, z: 20, story: 'The ferry crew’s winter coats had blue enamel buttons stamped with a wave.' },
  { id: 'stamp', name: 'Printer’s letter block', region: 'Town', x: 29, z: 4, story: 'A wooden W from the newspaper’s first hand-set headline.' },
  { id: 'spoon', name: 'Baker’s measuring spoon', region: 'Town', x: 18, z: -9, story: 'The old bakery measured yeast with this little copper spoon.' },
  { id: 'pottery', name: 'Blue pottery shard', region: 'Town', x: 32, z: -19, story: 'A thumbprint survives in the glaze of a bowl from the original pottery studio.' },
  { id: 'medal', name: 'Running club medal', region: 'Town', x: 41, z: 10, story: 'The first club race ended with tea, bread and a medal cut from brass sheet.' },
  { id: 'postcard', name: 'Meadow postcard', region: 'Western meadow', x: -59, z: 45, story: 'A faded card calls the western meadow “the place where the town breathes.”' },
  { id: 'bell', name: 'Shepherd’s bell', region: 'Western meadow', x: -86, z: 68, story: 'This small bell helped a shepherd find the flock in the evening mist.' },
  { id: 'horseshoe', name: 'Pony horseshoe', region: 'Western meadow', x: -102, z: 49, story: 'Before the paved lane, a pony carried flour from the mill into town.' },
  { id: 'acorn', name: 'Carved oak acorn', region: 'Northern woods', x: -33, z: -35, story: 'A trail keeper carved acorns as thank-you gifts for volunteer path repairs.' },
  { id: 'whistle', name: 'Ranger’s whistle', region: 'Northern woods', x: -50, z: -56, story: 'Three short notes once called the volunteer trail crew home for lunch.' },
  { id: 'compass', name: 'Cracked pocket compass', region: 'Northern woods', x: -70, z: -85, story: 'Its glass is cracked, but the needle still points toward the northern hills.' },
  { id: 'map', name: 'Folded trail map', region: 'Northern heights', x: -109, z: -122, story: 'A pencil line marks the old walking route to Northstar’s roof.' },
  { id: 'lens', name: 'Telescope eyepiece', region: 'Northstar Observatory', x: -115, z: -149, story: 'An early observer polished this glass through three cloudy winters.' },
  { id: 'star-chart', name: 'Hand-drawn star chart', region: 'Northstar Observatory', x: -149, z: -169, story: 'The chart pairs constellations with the months when the ferry last ran after dark.' },
  { id: 'lantern', name: 'Lighthouse lantern', region: 'Bracken Head', x: -137, z: 84, story: 'A keeper carried this little lamp along the headland before dawn.' },
  { id: 'anchor', name: 'Anchor brooch', region: 'Bracken Head', x: -180, z: 80, story: 'The harbor families wore anchor brooches at the lighthouse centenary.' },
  { id: 'feather', name: 'Kingfisher feather', region: 'Eastern wetland', x: 62, z: -42, story: 'A naturally shed blue feather, light enough to rest on a reed.' },
  { id: 'binoculars', name: 'Birdwatcher’s binoculars', region: 'Eastern woodland', x: 88, z: -78, story: 'A pair from the first wetland bird count, with its tally still scratched into the case.' },
  { id: 'rail-spike', name: 'Railway spike', region: 'Hollowstone Valley', x: 132, z: -89, story: 'The valley railway brought clay, letters and visitors into Willowbrook.' },
  { id: 'ticket', name: 'Last train ticket', region: 'Hollowstone Viaduct', x: 165, z: -96, story: 'A return ticket from the final passenger service over Hollowstone.' },
  { id: 'windmill', name: 'Wooden windmill toy', region: 'Briar Hill', x: 151, z: 63, story: 'The miller made little turning sails for children waiting outside with flour sacks.' },
  { id: 'grain-scoop', name: 'Mill grain scoop', region: 'Briar Hill', x: 185, z: 45, story: 'A wooden scoop from the mill’s last harvest, polished by years of use.' },
] as const;
export type Keepsake = typeof keepsakes[number];
export interface Collection { found: string[]; giftReceived: boolean }
export const historian = { id: 'historian', name: 'Elspeth', role: 'Local historian', x: -52, z: -20 } as const;
export const historianReward = {
  invitation: 'An evening at the Willowbrook archive',
  letter: 'Dear friend, you have brought all thirty little pieces of Willowbrook together. Please join me for tea and an evening of stories at my archive table beside the gallery. I have a small gift waiting for you. — Elspeth',
  gift: 'Willowbrook heritage compass',
  description: 'An engraved brass compass in a walnut case, inscribed “For the one who noticed.” A keepsake from Elspeth, kept in your collection.',
};
export function normalizeCollection(raw: unknown): Collection {
  const data = raw && typeof raw === 'object' ? raw as Partial<Collection> : {};
  const found = Array.isArray(data.found) ? [...new Set(data.found.filter((id): id is string => typeof id === 'string' && keepsakes.some(item => item.id === id)))] : [];
  return { found, giftReceived: found.length === keepsakes.length && data.giftReceived === true };
}
export const collectionComplete = (collection: Collection) => keepsakes.every(item => collection.found.includes(item.id));
export function collectKeepsake(collection: Collection, id: string): Collection {
  if (!keepsakes.some(item => item.id === id) || collection.found.includes(id)) return collection;
  return { ...collection, found: [...collection.found, id] };
}
export function receiveHistorianGift(collection: Collection): Collection {
  return collectionComplete(collection) && !collection.giftReceived ? { ...collection, giftReceived: true } : collection;
}
export function nearestKeepsake(collection: Collection, x: number, y: number, z: number, groundHeight: (x: number, z: number) => number, eyeHeight = 1.7, visible: (item: Keepsake) => boolean = () => true): Keepsake | undefined {
  let nearest: Keepsake | undefined, distance = 2.6;
  for (const item of keepsakes) {
    if (collection.found.includes(item.id)) continue;
    const next = Math.hypot(x - item.x, y - groundHeight(item.x, item.z) - eyeHeight, z - item.z);
    if (next < distance && visible(item)) { nearest = item; distance = next; }
  }
  return nearest;
}

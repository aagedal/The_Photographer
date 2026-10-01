// Shared sites keep terrain grading, scenery clearance and public entrances aligned.
export const galleryPlace = { name: 'Willowbrook Gallery', x: -43, z: -29, entrance: [-43, -21] as const };
export const unclePlace = { name: 'Arthur’s porch', x: -23, z: 42, entrance: [-23, 48] as const };
export const hospitalPlace = { name: 'Willowbrook Hospital', x: 61, z: 28, entrance: [61, 33] as const, recovery: [61, 28] as const };
export const woodlandCabins = [
  { id: 'ridge-cabin', name: 'Fernwood trail cabin', x: -121, z: -134, entrance: [-121, -128] as const, trail: [-109, -132] as const,
    note: 'A kettle, two bunks and a trail book. “Cloud on the ridge today. Deer feeding in the birches below the cabin. Left dry kindling for whoever comes next. — Mara”' },
  { id: 'birch-cabin', name: 'Birch Hollow cabin', x: 125, z: -43, entrance: [125, -37] as const, trail: [137, -39] as const,
    note: 'Someone has repaired the porch and left binoculars by the window. “The fox passes the eastern clearing at dusk. Sit quietly and the rabbits come back. Please leave the clearing as you found it. — Eli”' },
] as const;
interface BuildingSite { x:number; z:number; halfWidth:number; halfDepth:number; height?:number; shoulder?:number }
export const buildingSites: BuildingSite[] = [
  { ...galleryPlace, halfWidth: 8, halfDepth: 10, height: 2.5, shoulder: 5 },
  { ...unclePlace, z: 44, halfWidth: 5, halfDepth: 7, height: 0 },
  { ...hospitalPlace, halfWidth: 7, halfDepth: 8, height: 0.8 },
  { x: -41, z: 31, halfWidth: 13, halfDepth: 15, height: 0 },
  // Grade the original town buildings as well as the larger sites.
  ...[[4,-22,5,5],[-19,-25,4.5,5],[22,-36,5,5],[40,-14,5,6],[4,-36,8,6],[13,-14,7,6],[30,-25,9,8]].map(([x,z,halfWidth,halfDepth]) => ({x,z,halfWidth,halfDepth,height:0})),
  ...woodlandCabins.map(cabin => ({ ...cabin, halfWidth: 6, halfDepth: 8, height: undefined })),
];
export const nearBuildingSite = (x: number, z: number, margin = 0) => buildingSites.some(site => Math.abs(x-site.x) < site.halfWidth+margin && Math.abs(z-site.z) < site.halfDepth+margin);

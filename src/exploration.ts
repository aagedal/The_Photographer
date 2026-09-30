import { missions, type Mission } from './missions.ts';
import { ownsGear, type Economy } from './economy.ts';
import { terrainHeight } from './terrain.ts';

export const starterMission = 'nature-1';
export const npcCatalog = [
  { id: 'ranger', name: 'Mara', role: 'Creek ranger', x: -29, z: 4, shirt: '#738b57', dialogue: 'Follow the creek for soft water. The eastern woodland trail leads to our kingfisher wetland. Give the birds space: a long lens brings the detail to you.', missions: ['nature-2', 'nature-birds', 'intro-deer'] },
  { id: 'coach', name: 'Theo', role: 'Running coach', x: 39, z: 17, shirt: '#c98259', dialogue: 'Our club could use a race poster. Try freezing a stride, then follow the runner for a frame that feels fast.', missions: ['sports-1', 'sports-2'] },
  { id: 'editor', name: 'June', role: 'Local editor', x: 18, z: -6, shirt: '#68898d', dialogue: 'The morning baker and our evening reporter each have a story. Come back in their light and tell it with a photograph.', missions: ['news-1', 'news-2'] },
  { id: 'planner', name: 'Alma', role: 'Garden host', x: -33, z: 32, shirt: '#b9828d', dialogue: 'The couple have a quiet moment by the arch. Later, bring everyone into focus for the family photograph.', missions: ['wedding-1', 'wedding-2'] },
  { id: 'maker', name: 'Eli', role: 'Studio assistant', x: 23, z: -18, shirt: '#b78568', dialogue: 'The maker and their vase are ready in the studio. Shape a portrait with the lights, then show every detail of the pottery.', missions: ['studio-1', 'studio-2'] },
  { id: 'astronomer', name: 'Ida', role: 'Ridge astronomer', x: -53, z: -68, shirt: '#687b9a', dialogue: 'Up here the town lights fall away. Wait for night: gather starlight, or let a longer exposure draw its paths.', missions: ['astro-1', 'astro-2'] },
] as const;
export type NPC = typeof npcCatalog[number];
export const npcPosition = (npc: NPC): [number, number, number] => [npc.x, terrainHeight(npc.x, npc.z), npc.z];
export function normalizeDiscovered(raw: unknown, evidence: unknown[] = []) {
  const ids = Array.isArray(raw) ? raw : [];
  return [...new Set([starterMission, ...ids, ...evidence].filter((id): id is string => missions.some(m => m.id === id)))];
}
export const discoverNPC = (discovered: string[], npc: NPC) => normalizeDiscovered([...discovered, ...npc.missions]);
export const missionGearReady = (mission: Mission, economy: Economy) => !mission.requiredGear || ownsGear(economy, mission.requiredGear);
export const canAcceptMission = (mission: Mission, discovered: string[], economy: Economy) => discovered.includes(mission.id) && missionGearReady(mission, economy);
export function nearestNPC(x: number, y: number, z: number, position: (npc: NPC) => [number, number, number] = npcPosition): NPC | undefined {
  let closest: NPC | undefined, distance = 4;
  for (const npc of npcCatalog) {
    const [nx, ny, nz] = position(npc);
    const next = Math.hypot(x - nx, y - ny - 1.7, z - nz);
    if (next < distance) { closest = npc; distance = next; }
  }
  return closest;
}

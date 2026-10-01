import { missions } from './missions.ts';
import { balance, type Economy } from './economy.ts';

export const PRINT_PRICE = 5;
export const EXHIBITION_DAILY = 5;
export const ROOM_RENT = 2;
export const COTTAGE_PRICE = 350;
export interface GalleryPrint { photoId: string; missionId: string; image: string }
export interface Story {
  version: 1; deerShown: boolean; reconciled: boolean; exhibition: boolean;
  prints: GalleryPrint[]; day: number; home: 'room' | 'cottage'; rentArrears: number;
  legacyKnown: string[];
}
export const freshStory = (): Story => ({ version: 1, deerShown: false, reconciled: false, exhibition: false, prints: [], day: 1, home: 'room', rentArrears: 0, legacyKnown: [] });
const integer = (raw: unknown, fallback = 0) => typeof raw === 'number' && Number.isFinite(raw) ? Math.max(0, Math.min(10000000, Math.floor(raw))) : fallback;
export function normalizeStory(raw: unknown, completed: string[], known: string[] = []): Story {
  const data = raw && typeof raw === 'object' ? raw as Partial<Story> : {};
  const story = freshStory();
  story.legacyKnown = [...new Set((data.version === 1 && Array.isArray(data.legacyKnown) ? data.legacyKnown : data.version !== 1 ? known : []).filter(id => missions.some(m => m.id === id && !['nature-bear', 'news-townhall'].includes(id))))];
  story.deerShown = data.deerShown === true || (data.version !== 1 && completed.some(id => ['wedding-1', 'wedding-2', 'sports-1', 'news-1', 'news-2'].includes(id)));
  story.prints = Array.isArray(data.prints) ? data.prints.filter((p): p is GalleryPrint => !!p && typeof p.photoId === 'string' && missions.some(m => m.id === p.missionId && completed.includes(m.id)) && typeof p.image === 'string' && /^data:image\/jpeg;base64,/.test(p.image) && p.image.length < 800000).filter((p, i, list) => list.findIndex(other => other.missionId === p.missionId) === i).slice(0, missions.length) : [];
  story.exhibition = data.exhibition === true && story.prints.length >= 5;
  story.reconciled = data.reconciled === true && completed.includes('nature-bear') && story.prints.some(p => p.missionId === 'nature-bear');
  story.day = Math.max(1, integer(data.day, 1));
  story.home = data.home === 'cottage' ? 'cottage' : 'room';
  story.rentArrears = integer(data.rentArrears);
  return story;
}
export const mainStoryIds = ['intro-deer', 'wedding-1', 'wedding-2', 'sports-1', 'news-townhall', 'nature-bear'];
export function storyMissionUnlocked(id: string, story: Story, completed: string[]) {
  if (completed.includes(id) || story.legacyKnown.includes(id)) return true;
  switch (id) {
    case 'intro-deer': return true;
    case 'nature-1': return completed.includes('intro-deer');
    case 'wedding-1': case 'studio-1': case 'studio-2': return story.deerShown;
    case 'wedding-2': return story.deerShown && completed.includes('wedding-1');
    case 'sports-1': case 'nature-2': case 'astro-1': case 'astro-2': return story.deerShown && completed.includes('wedding-2');
    case 'sports-2': case 'news-1': case 'news-2': case 'nature-birds': case 'news-townhall': return story.deerShown && completed.includes('wedding-2') && completed.includes('sports-1');
    case 'nature-bear': return story.deerShown && completed.includes('news-townhall');
    default: return false;
  }
}
export function storyObjective(story: Story, completed: string[]) {
  if (story.reconciled) return { chapter: 'Home, at last', title: 'A place to stay', text: 'Arthur keeps the bear photograph beside his chair. There is time to sit together. Willowbrook is your home now; the gallery and the town’s other stories are still yours to explore.', action: 'uncle' as const };
  if (!completed.includes('intro-deer') && !story.deerShown) return { chapter: '1 · Coming home', title: 'A different kind of hunting', text: 'You moved to Willowbrook because Uncle Arthur is dying. He asks for a photograph of the rare pale bear he once saw. Your 35 mm lens cannot reach it safely. Mara suggests a deer in the western meadow: begin with a small, quiet moment.', action: 'mission' as const, missionId: 'intro-deer' };
  if (!story.deerShown) return { chapter: '2 · Something worth showing', title: 'Your first print', text: 'Arthur wants to see what you found. Visit Willowbrook Gallery, print your successful deer photograph for free, and hang it on the wall. Then visit Arthur on his porch. A small beginning can bring people together.', action: 'gallery' as const };
  if (!completed.includes('wedding-1')) return { chapter: '3 · A familiar face', title: 'An invitation from Alma', text: 'Arthur smiles at your deer print. Alma saw it at the gallery: “You’re the photographer who just moved here. Would you photograph our wedding?” The couple are waiting beneath the garden arch. Your first paid commission opens the studio’s side jobs, too.', action: 'mission' as const, missionId: 'wedding-1' };
  if (!completed.includes('wedding-2')) return { chapter: '3 · A familiar face', title: 'Room for the whole family', text: 'Alma loves the portrait. Before the celebration ends, gather the family for one more photograph. Stop down so everyone can share the memory.', action: 'mission' as const, missionId: 'wedding-2' };
  if (!completed.includes('sports-1')) return { chapter: '4 · The town takes notice', title: 'A call from the newspaper', text: 'Your wedding photographs made the rounds. June at the Willowbrook paper asks you to cover the local race with Theo. Capture a sharp stride at Oakfield Track. More side assignments are now available from Mara and Ida.', action: 'mission' as const, missionId: 'sports-1' };
  if (!completed.includes('news-townhall')) return { chapter: '5 · Behind closed doors', title: 'June’s tip', text: 'June trusts your eye after the race. A source says Councillor Vale is exchanging papers with a developer in the town hall at night. Photograph the exchange from the public path through the reflected window. June will investigate; one photograph cannot tell the whole story.', action: 'mission' as const, missionId: 'news-townhall' };
  if (!completed.includes('nature-bear')) return { chapter: '6 · One last wild thing', title: 'Back to Arthur', text: 'June has the photograph and is following the paper trail. You have earned a place in town, but Arthur’s wish brought you here. Mara has located the pale bear. Buy the $480 wildlife lens, then photograph it from the northern overlook, at least 20 metres away.', action: 'mission' as const, missionId: 'nature-bear' };
  return { chapter: '7 · Time together', title: 'Bring the bear home', text: 'You found the bear and let it remain wild. Print its photograph at the gallery for free, then bring it to Arthur’s porch. Some photographs are made for one person.', action: 'uncle' as const };
}
export function storyDiscoveries(story: Story, completed: string[], known: string[]) {
  const objective = storyObjective(story, completed);
  const ids = [...known];
  if ('missionId' in objective && objective.missionId && storyMissionUnlocked(objective.missionId, story, completed)) ids.push(objective.missionId);
  if (completed.includes('intro-deer')) ids.push('nature-1');
  return [...new Set(ids)].filter(id => storyMissionUnlocked(id, story, completed));
}
export function printPhoto(story: Story, economy: Economy, completed: string[], photo: { id: string; missionId: string; image: string; result: { passed: boolean } }) {
  if (!photo.result.passed || !completed.includes(photo.missionId)) return { ok: false as const, reason: 'Choose a successful photograph.' };
  if (story.prints.some(p => p.missionId === photo.missionId)) return { ok: false as const, reason: 'This story already has a print on the wall.' };
  const cost = ['intro-deer', 'nature-bear'].includes(photo.missionId) ? 0 : PRINT_PRICE;
  if (balance(economy, completed) < cost) return { ok: false as const, reason: 'A print costs $5. Earn a commission first.' };
  return { ok: true as const, story: { ...story, prints: [...story.prints, { photoId: photo.id, missionId: photo.missionId, image: photo.image }] }, economy: chargeLiving(economy, 'printCosts', cost) };
}
export function visitUncle(story: Story, completed: string[]) {
  if (!story.deerShown && story.prints.some(p => p.missionId === 'intro-deer')) return { ...story, deerShown: true };
  if (story.deerShown && completed.includes('nature-bear') && story.prints.some(p => p.missionId === 'nature-bear')) return { ...story, reconciled: true };
  return story;
}
export const startExhibition = (story: Story): Story => story.prints.length >= 5 ? { ...story, exhibition: true } : story;
export function chargeLiving(economy: Economy, key: 'printCosts' | 'rentPaid' | 'homeCosts' | 'exhibitionIncome', amount: number): Economy {
  if (!amount) return economy;
  return { ...economy, living: { ...economy.living, [key]: (economy.living?.[key] ?? 0) + amount } };
}
export function settleDays(story: Story, economy: Economy, completed: string[], days: number) {
  days = integer(days);
  if (!days) return { story, economy, income: 0, rent: 0 };
  const income = story.exhibition ? days * EXHIBITION_DAILY : 0;
  economy = chargeLiving(economy, 'exhibitionIncome', income);
  const owed = story.rentArrears + (story.deerShown && story.home === 'room' ? days * ROOM_RENT : 0);
  const rent = Math.min(owed, Math.max(0, balance(economy, completed)));
  economy = chargeLiving(economy, 'rentPaid', rent);
  return { story: { ...story, day: story.day + days, rentArrears: owed - rent }, economy, income, rent };
}
export function buyCottage(story: Story, economy: Economy, completed: string[]) {
  const price = COTTAGE_PRICE + story.rentArrears;
  if (!story.deerShown || story.home === 'cottage' || balance(economy, completed) < price) return { ok: false as const };
  economy = chargeLiving(chargeLiving(economy, 'rentPaid', story.rentArrears), 'homeCosts', COTTAGE_PRICE);
  return { ok: true as const, story: { ...story, home: 'cottage' as const, rentArrears: 0 }, economy };
}

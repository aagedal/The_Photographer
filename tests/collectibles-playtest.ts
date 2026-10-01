import { keepsakes, historian } from '../src/collectibles.ts';
import { freshStory } from '../src/story.ts';
import { normalizeEconomy } from '../src/economy.ts';

function start(position: [number, number], found: string[]) {
  localStorage.setItem('the-photographer-playtest-keepsakes-v1', JSON.stringify({
    version: 1, filterShopVersion: 1, openingSeen: true, walkingIntroduction: false,
    collection: { found, giftReceived: false }, story: freshStory(), economy: normalizeEconomy(undefined, []),
    position, completed: [], discovered: ['nature-1'], active: 'nature-1', photos: [], hour: 16,
  }));
  location.assign('/?playtest=keepsakes');
}
document.getElementById('first')!.onclick = () => start([15, 89], []);
document.getElementById('last')!.onclick = () => start([185, 45], keepsakes.slice(0, -1).map(item => item.id));
document.getElementById('reward')!.onclick = () => start([historian.x, historian.z], keepsakes.map(item => item.id));

import { missions } from './missions.ts';
import { filterCatalog, isFilterGear, type FilterId } from './filters.ts';
import { normalizeFilm, type Film } from './film.ts';

export const gearCatalog = [
  { id: 'zoom', name: '24–120 mm zoom lens', price: 120, icon: 'aperture', description: 'Frame distant subjects or go wide. Scroll or use −/+ to zoom.' },
  { id: 'flash', name: 'Camera flash', price: 180, icon: 'bolt', description: 'Light a close subject against a darker background. F toggles flash; L adjusts power.' },
  { id: 'burst', name: 'Digital burst camera', price: 360, icon: 'burst', description: 'Shoot without film or winding on. Catch changing moments with three frames at 5 fps. B switches single / burst; Space shoots.' },
  { id: 'telephoto', name: '200–600 mm wildlife lens', price: 480, icon: 'aperture', description: 'Unlock bird close-ups from a respectful distance. Choose it in the LENS dropdown, then scroll or use −/+ to zoom.' },
  ...filterCatalog.map(filter => ({ id: filter.id, name: filter.name, price: filter.price, icon: 'filter', description: filter.description })),
] as const;
export type GearId = typeof gearCatalog[number]['id'];
export const STARTING_MONEY = 20;
export interface Economy { purchased: GearId[]; gifted: GearId[]; burstEnabled: boolean; startingMoney?: number; film?: Film; living?: { exhibitionIncome?: number; printCosts?: number; rentPaid?: number; homeCosts?: number } }
export const withStartingMoney = (economy: Economy): Economy => ({ ...economy, startingMoney: STARTING_MONEY });
export const money = (amount: number) => `$${amount}`;
export const normalizeCompleted = (raw: unknown): string[] => Array.isArray(raw) ? [...new Set(raw.filter((id): id is string => missions.some(m => m.id === id)))] : [];
export const earnedMoney = (completed: string[]) => missions.filter(m => completed.includes(m.id)).reduce((sum, m) => sum + m.payment, 0);
export const ownsGear = (economy: Economy, id: GearId) => economy.purchased.includes(id) || economy.gifted.includes(id);
export const equippedFilter = (raw: unknown, economy: Economy): FilterId => isFilterGear(raw) && ownsGear(economy, raw) ? raw : 'none';
export const accountBalance = (economy: Economy, completed: string[]) => (economy.startingMoney ?? 0) + earnedMoney(completed) + (economy.living?.exhibitionIncome ?? 0) - (economy.living?.printCosts ?? 0) - (economy.living?.rentPaid ?? 0) - (economy.living?.homeCosts ?? 0) - (economy.film?.costs ?? 0) - gearCatalog.filter(g => economy.purchased.includes(g.id)).reduce((sum, g) => sum + g.price, 0);
export const balance = (economy: Economy, completed: string[]) => Math.max(0, accountBalance(economy, completed));

export function normalizeEconomy(raw: unknown, completed: string[], legacyFlashUsed = false, legacyFilters = false): Economy {
  const data = raw && typeof raw === 'object' ? raw as Partial<Economy> : {};
  const validIds = (value: unknown): GearId[] => Array.isArray(value) ? [...new Set(value.filter((id): id is GearId => gearCatalog.some(g => g.id === id)))] : [];
  const gifted = validIds(data.gifted);
  // Preserve a flash already used in an older notebook when adding the shop.
  if (raw === undefined && legacyFlashUsed && !gifted.includes('flash')) gifted.push('flash');
  if (legacyFilters) for (const id of ['nd6', 'cpl'] as const) {
    if (!gifted.includes(id) && !validIds(data.purchased).includes(id)) gifted.push(id);
  }
  const economy: Economy = { purchased: [], gifted, burstEnabled: false };
  if (data.startingMoney !== undefined) economy.startingMoney = data.startingMoney === STARTING_MONEY ? STARTING_MONEY : 0;
  if (data.living && typeof data.living === 'object') {
    economy.living = {};
    for (const key of ['exhibitionIncome', 'printCosts', 'rentPaid', 'homeCosts'] as const) {
      const value = data.living[key];
      if (typeof value === 'number' && Number.isFinite(value)) economy.living[key] = Math.max(0, Math.min(10000000, Math.floor(value)));
    }
  }
  for (const id of validIds(data.purchased)) {
    const gear = gearCatalog.find(g => g.id === id)!;
    if (!ownsGear(economy, id) && balance(economy, completed) >= gear.price) economy.purchased.push(id);
  }
  economy.burstEnabled = data.burstEnabled === true && ownsGear(economy, 'burst');
  // Film may have been bought on a tab after gear. Keep that gear on reload.
  if (data.film !== undefined) economy.film = normalizeFilm(data.film);
  return economy;
}
export function purchaseGear(economy: Economy, completed: string[], id: GearId) {
  const gear = gearCatalog.find(g => g.id === id);
  if (!gear) return { ok: false as const, reason: 'invalid' as const, shortfall: 0 };
  if (ownsGear(economy, id)) return { ok: false as const, reason: 'owned' as const, shortfall: 0 };
  const shortfall = gear.price - balance(economy, completed);
  if (shortfall > 0) return { ok: false as const, reason: 'funds' as const, shortfall };
  return { ok: true as const, economy: { ...economy, purchased: [...economy.purchased, id], burstEnabled: id === 'burst' || economy.burstEnabled } };
}
export function completeMission(completed: string[], missionId: string, passed: boolean) {
  const mission = missions.find(m => m.id === missionId);
  const ids = normalizeCompleted(completed);
  if (!passed || !mission || ids.includes(missionId)) return { completed: ids, payment: 0 };
  return { completed: [...ids, missionId], payment: mission.payment };
}

export const captureCount = (economy: Economy) => ownsGear(economy, 'burst') && economy.burstEnabled ? 3 : 1;
export type LensId = 'prime' | 'zoom' | 'telephoto';
export function normalizeLens(raw: unknown, economy: Economy): LensId {
  if (raw === 'prime') return 'prime';
  if ((raw === 'zoom' || raw === 'telephoto') && ownsGear(economy, raw)) return raw;
  return ownsGear(economy, 'zoom') ? 'zoom' : 'prime';
}
export const focalRange = (economy: Economy, lens: LensId = normalizeLens(undefined, economy)): [number, number] => lens === 'telephoto' && ownsGear(economy, lens) ? [200, 600] : lens === 'zoom' && ownsGear(economy, lens) ? [24, 120] : [35, 35];
export function zoomFocal(economy: Economy, focal: number, wheelDelta: number, lens?: LensId) {
  const [min, max] = focalRange(economy, lens);
  return Math.max(min, Math.min(max, focal * Math.exp(-wheelDelta * 0.0015)));
}
export const fovForFocal = (focal: number, aspect: number) => 2 * Math.atan(24 / (2 * focal * Math.min(1, aspect / 1.5))) * 180 / Math.PI;

export class CaptureSequence {
  private remaining = 0;
  private total = 0;
  private nextShot = 0;
  get active() { return this.remaining > 0; }
  start(now: number, count: 1 | 3) {
    if (this.active) return false;
    this.remaining = this.total = count; this.nextShot = now;
    return true;
  }
  take(now: number) {
    if (!this.active || now < this.nextShot) return null;
    this.remaining--; this.nextShot = now + 200;
    return { index: this.total - this.remaining, total: this.total, last: this.remaining === 0 };
  }
  cancel() { this.remaining = 0; }
}

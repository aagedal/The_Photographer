import { balance, ownsGear, type Economy } from './economy.ts';

export const FILM_FRAMES = 24;
export const FILM_PRICE = 12;
export const FILM_WIND_MS = 900;
export interface Film { frames: number; costs: number; rolls?: number }
export const usesFilm = (economy: Economy) => !ownsGear(economy, 'burst');
export const filmFrames = (economy: Economy) => economy.film?.frames ?? FILM_FRAMES;
export const spareRolls = (economy: Economy) => economy.film?.rolls ?? 0;
export function normalizeFilm(raw: unknown): Film {
  const data = raw && typeof raw === 'object' ? raw as Partial<Film> : {};
  const integer = (value: unknown, fallback: number, max: number) => typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.min(max, Math.floor(value))) : fallback;
  return { frames: integer(data.frames, FILM_FRAMES, FILM_FRAMES), costs: integer(data.costs, 0, 10000000), ...(data.rolls !== undefined ? { rolls: integer(data.rolls, 0, 999) } : {}) };
}
export function exposeFilm(economy: Economy): Economy | null {
  if (!usesFilm(economy)) return economy;
  if (filmFrames(economy) === 0) return null;
  return { ...economy, film: { ...economy.film, frames: filmFrames(economy) - 1, costs: economy.film?.costs ?? 0 } };
}
export function reloadFilm(economy: Economy): Economy | null {
  if (!usesFilm(economy) || filmFrames(economy) > 0 || spareRolls(economy) === 0) return null;
  return { ...economy, film: { frames: FILM_FRAMES, rolls: spareRolls(economy) - 1, costs: economy.film?.costs ?? 0 } };
}
// Only an empty camera with no spare rolls can get film on a tab.
export function buyFilm(economy: Economy, completed: string[], onTab = false) {
  if (!usesFilm(economy) || spareRolls(economy) >= 999) return { ok: false as const };
  if (balance(economy, completed) < FILM_PRICE && (!onTab || filmFrames(economy) > 0 || spareRolls(economy) > 0)) return { ok: false as const };
  const empty = filmFrames(economy) === 0;
  return { ok: true as const, economy: { ...economy, film: { frames: empty ? FILM_FRAMES : filmFrames(economy), rolls: spareRolls(economy) + (empty ? 0 : 1), costs: (economy.film?.costs ?? 0) + FILM_PRICE } } };
}

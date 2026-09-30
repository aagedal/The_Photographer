export const filterCatalog = [
  { id: 'nd4', label: 'ND16', name: 'ND16 filter', price: 45, stops: 4, description: 'Four stops less light across the frame. Use longer shutters in daylight.' },
  { id: 'nd5', label: 'ND32', name: 'ND32 filter', price: 60, stops: 5, description: 'Five stops less light. More room for motion blur and flowing water.' },
  { id: 'nd6', label: 'ND64', name: 'ND64 filter', price: 75, stops: 6, description: 'Six stops less light. Ideal for long daylight exposures on a tripod.' },
  { id: 'cpl', label: 'CPL', name: 'Circular polarizer', price: 90, stops: 1, description: 'Reduce glare on glass and water. Reveal subjects behind windows and fish beneath the surface. Costs one stop of light.' },
  { id: 'gnd3', label: 'GND8 soft', name: 'Graduated ND8 filter', price: 100, stops: 0, description: 'Darken the top of the frame by up to three stops while keeping the bottom clear. Adjust the soft transition height for the horizon.' },
] as const;
export type FilterGearId = typeof filterCatalog[number]['id'];
export type FilterId = 'none' | FilterGearId;
export const isFilterGear = (id: unknown): id is FilterGearId => filterCatalog.some(filter => filter.id === id);
export const filterLabel = (id: FilterId) => filterCatalog.find(filter => filter.id === id)?.label ?? 'No filter';
// Uniform filters affect the whole exposure; the graduated filter is spatial.
export const filterStops = (id: FilterId) => filterCatalog.find(filter => filter.id === id)?.stops ?? 0;
export const gradientPosition = (value?: number) => Number.isFinite(value) ? Math.max(0.1, Math.min(0.9, value!)) : 0.5;
export function graduatedStops(id: FilterId, imageY = 0.5, position?: number): number {
  if (id !== 'gnd3') return 0;
  const t = Math.max(0, Math.min(1, (imageY - gradientPosition(position) + 0.15) / 0.3));
  return 3 * (1 - t * t * (3 - 2 * t));
}

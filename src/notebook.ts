import { missions } from './missions.ts';

export type MissionSection = 'active' | 'available' | 'completed';
export function notebookMissions(discovered: string[], completed: string[], active: string, section: MissionSection) {
  return missions.filter(m => discovered.includes(m.id) && (
    section === 'completed' ? completed.includes(m.id) :
    section === 'active' ? m.id === active && !completed.includes(m.id) :
    m.id !== active && !completed.includes(m.id)
  ));
}

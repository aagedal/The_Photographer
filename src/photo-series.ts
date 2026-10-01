import { missions, type Mission, type MissionShot } from './missions.ts';
import type { Assessment, Feedback } from './photography.ts';

export interface ShotReceipt { shotId: string; photoId: string }
export type SeriesProgress = Record<string, ShotReceipt[]>;
type SeriesPhoto = { id: string; missionId: string; shotId?: string; result: { passed: boolean } };

/** Receipts survive the rolling journal. Old completed assignments remain earned. */
export function normalizeSeries(raw: unknown, photos: SeriesPhoto[] = []): SeriesProgress {
  const progress: SeriesProgress = {};
  const entries = raw && typeof raw === 'object' ? raw as Record<string, unknown> : {};
  for (const m of missions.filter(m => m.shots)) {
    const list = entries[m.id];
    const receipts = Array.isArray(list) ? list : [];
    const recovered = photos.filter(p => p?.missionId === m.id && p.result?.passed && p.shotId).map(p => ({ shotId: p.shotId, photoId: p.id }));
    const accepted: ShotReceipt[] = [];
    for (const r of [...receipts, ...recovered]) {
      if (!r || !m.shots!.some(s => s.id === r.shotId) || typeof r.photoId !== 'string' || !r.photoId.length || r.photoId.length > 100) continue;
      if (accepted.some(a => a.shotId === r.shotId || a.photoId === r.photoId)) continue;
      accepted.push({ shotId: r.shotId, photoId: r.photoId });
    }
    if (accepted.length) progress[m.id] = accepted;
  }
  return progress;
}

export function shotDone(m: Mission, shot: MissionShot, progress: SeriesProgress, completed: string[]) {
  return completed.includes(m.id) || !!progress[m.id]?.some(r => r.shotId === shot.id);
}
export function nextShot(m: Mission, progress: SeriesProgress, completed: string[]) {
  return m.shots?.find(s => !shotDone(m,s,progress,completed)) ?? m.shots?.[0];
}
export function shotMission(m: Mission, shot?: MissionShot): Mission {
  return shot ? { ...m, ...shot.overrides, shots: undefined } : m;
}
export function seriesCount(m: Mission, progress: SeriesProgress, completed: string[]) {
  return m.shots?.filter(s => shotDone(m,s,progress,completed)).length ?? (completed.includes(m.id) ? 1 : 0);
}
export function recordShot(progress: SeriesProgress, m: Mission, shot: MissionShot | undefined, photo: SeriesPhoto) {
  if (!shot || !photo.result.passed || photo.missionId !== m.id || photo.shotId !== shot.id || !m.shots?.some(s => s.id === shot.id)) return progress;
  if (progress[m.id]?.some(r => r.shotId === shot.id || r.photoId === photo.id)) return progress;
  return { ...progress, [m.id]: [...(progress[m.id] ?? []), { shotId: shot.id, photoId: photo.id }] };
}
export function seriesReady(m: Mission, progress: SeriesProgress, photoPassed: boolean) {
  return m.shots ? m.shots.every(s => progress[m.id]?.some(r => r.shotId === s.id)) : photoPassed;
}

/** Bearing is measured around a common anchor, so changing aim or zoom cannot earn a new view. */
export function shotViewFeedback(m: Mission, shot: MissionShot, position: readonly number[]): Feedback {
  const [x,,z] = position;
  const dx=x-m.position[0], dz=z-m.position[2], distance=Math.hypot(dx,dz);
  const rx=m.viewpoint[0]-m.position[0], rz=m.viewpoint[2]-m.position[2];
  const reference=Math.hypot(rx,rz);
  const angle=distance > 0 && reference > 0 ? Math.acos(Math.max(-1,Math.min(1,(dx*rx+dz*rz)/(distance*reference))))*180/Math.PI : NaN;
  const [near,far]=shot.view.distance, [min,max]=shot.view.angle;
  const passed=distance>=near && distance<=far && angle>=min-1e-6 && angle<=max+1e-6;
  return { label: shot.title, passed, text: passed ? `This ${distance.toFixed(1)} m view adds the requested perspective to your story.` : `Move to the requested viewpoint: ${near}–${far} m away and ${min}–${max}° around from the front view. Changing zoom or taking another burst from the same place does not change perspective. Use Find the spot for a starting position.` };
}
export function assessShotView(result: Assessment, m: Mission, shot: MissionShot | undefined, position: readonly number[]): Assessment {
  if (!shot) return result;
  const feedback=[...result.feedback,shotViewFeedback(m,shot,position)];
  return { ...result, feedback, passed: feedback.every(f=>f.passed), score: Math.round(100*feedback.filter(f=>f.passed).length/feedback.length) };
}

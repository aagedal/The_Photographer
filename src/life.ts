import { coastline } from './terrain.ts';
import { DAY_SECONDS, wrapHour } from './environment.ts';

export type Route = readonly (readonly [number, number])[];
const mod = (n: number, d: number) => ((n % d) + d) % d;
export const routeLength = (route: Route) => route.slice(1).reduce((sum, p, i) => sum + Math.hypot(p[0] - route[i][0], p[1] - route[i][1]), 0);

// Distance-based, absolute sampling also works when a photograph samples the
// past and future shutter interval. No accumulated simulation state to rewind.
export function routePose(route: Route, distance: number) {
  let remaining = mod(distance, routeLength(route));
  for (let i = 1; i < route.length; i++) {
    const [ax, az] = route[i - 1], [bx, bz] = route[i];
    const length = Math.hypot(bx - ax, bz - az);
    if (remaining <= length && length > 0) {
      const t = remaining / length;
      return { x: ax + (bx - ax) * t, z: az + (bz - az) * t, yaw: Math.atan2(bx - ax, bz - az) };
    }
    remaining -= length;
  }
  return { x: route[0][0], z: route[0][1], yaw: 0 };
}

export function isActiveHour(hour: number, start: number, end: number) {
  return mod(wrapHour(hour) - start, 24) < mod(end - start, 24);
}

// Complete whole excursions within a working day, arriving back at the first
// waypoint before closing. Each circuit includes a pause to look around.
export function routinePose(route: Route, hour: number, start = 7, end = 21, speed = 0.85, pause = 7) {
  const length = routeLength(route), duration = mod(end - start, 24) * DAY_SECONDS / 24;
  if (!isActiveHour(hour, start, end)) return { ...routePose(route, 0), walking: false };
  const desiredPeriod = length / speed + pause;
  const period = duration / Math.max(1, Math.floor(duration / desiredPeriod));
  const within = mod(mod(hour - start, 24) * DAY_SECONDS / 24, period);
  const walking = within < period - pause;
  const distance = walking ? within / (period - pause) * length : 0;
  return { ...routePose(route, distance), walking };
}

export const localRoutes: Record<string, Route> = {
  ranger: [[-29,4],[-33,5],[-34,9],[-29,9],[-29,4]],
  coach: [[39,17],[42,17],[42,24],[39,24],[39,17]],
  editor: [[18,-6],[17.5,-4],[17.5,6],[17.5,-4],[18,-6]],
  planner: [[-33,32],[-34,34],[-28,34],[-28,32],[-33,32]],
  maker: [[23,-18],[20,-18],[20,-25],[22,-25],[23,-18]],
  astronomer: [[-53,-68],[-55,-66],[-56,-70],[-53,-70],[-53,-68]],
};
export const localPose = (id: string, hour: number) => routinePose(localRoutes[id], hour, id === 'astronomer' ? 18 : 7, id === 'astronomer' ? 6 : 21, 0.65, 10);
export function localActivity(id: string, hour: number) {
  if (id === 'astronomer') return isActiveHour(hour, 18, 6) ? 'Watching the sky' : 'Off duty · back on the ridge tonight';
  if (!isActiveHour(hour, 7, 21)) return 'Off duty · available for a quiet chat';
  return hour >= 17 ? 'Evening stroll' : 'Out and about';
}

// Rounded roads and sidewalks share their centerline with traffic and the map.
export function neighborhoodLoop(inset = 0): [number, number][] {
  const left = -7 + inset, right = 48 - inset, top = 37 + inset, bottom = 61 - inset;
  const radius = 4, route: [number, number][] = [];
  for (const [x, z, angle] of [[right-radius,top+radius,-Math.PI/2],[right-radius,bottom-radius,0],[left+radius,bottom-radius,Math.PI/2],[left+radius,top+radius,Math.PI]]) {
    for (let i = 0; i <= 8; i++) {
      const a = angle + i / 8 * Math.PI / 2;
      route.push([x + Math.cos(a) * radius, z + Math.sin(a) * radius]);
    }
  }
  route.push([...route[0]]);
  return route;
}
export const townRoad = neighborhoodLoop();
export const townSidewalk = neighborhoodLoop(4.2);
export const trafficRoutes = [neighborhoodLoop(-1.4), neighborhoodLoop(1.4)];

export function ambientLevels(hour: number, x: number, z: number) {
  const day = isActiveHour(hour, 5.5, 20.5) ? 1 : 0;
  const nature = Math.min(1, Math.hypot(x - 15, z - 25) / 60);
  return {
    wind: 0.035,
    ocean: 0.16 / (1 + ((coastline(x) - z) / 18) ** 2),
    water: 0.2 / (1 + (Math.hypot(x + 26, z + 12) / 16) ** 2),
    birds: day * (0.3 + nature * 0.7),
    crickets: (1 - day) * (0.35 + nature * 0.65),
    town: (day ? 1 : 0.12) / (1 + (Math.hypot(x - 20, z - 35) / 30) ** 2),
  };
}

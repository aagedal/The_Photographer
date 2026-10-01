export type WalkPoint = readonly [number, number];
type Walkable = (x: number, z: number) => boolean;
const distance = (a: WalkPoint, b: WalkPoint) => Math.hypot(a[0] - b[0], a[1] - b[1]);

// Use the same collision predicate as movement, including between grid cells.
export function clearWalk(a: WalkPoint, b: WalkPoint, canWalk: Walkable) {
  const steps = Math.max(1, Math.ceil(distance(a, b) / 0.2));
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    if (!canWalk(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t)) return false;
  }
  return true;
}

export function walkingRoute(start: WalkPoint, goal: WalkPoint, canWalk: Walkable, half = 256): WalkPoint[] {
  if (![...start, ...goal, half].every(Number.isFinite) || half <= 0 || !canWalk(...start) || !canWalk(...goal)) return [];
  if (clearWalk(start, goal, canWalk)) return [goal];
  const step = 2, size = Math.floor(half * 2 / step) + 1;
  const point = (id: number): WalkPoint => [(id % size) * step - half, Math.floor(id / size) * step - half];
  const cell = (p: WalkPoint) => [Math.round((p[0] + half) / step), Math.round((p[1] + half) / step)];
  const available = new Int8Array(size * size);
  const openCell = (id: number) => {
    if (!available[id]) available[id] = canWalk(...point(id)) ? 1 : -1;
    return available[id] === 1;
  };
  const connectors = (p: WalkPoint) => {
    const [cx, cz] = cell(p), ids: number[] = [];
    for (let dz = -2; dz <= 2; dz++) for (let dx = -2; dx <= 2; dx++) {
      const x = cx + dx, z = cz + dz, id = z * size + x;
      if (x >= 0 && z >= 0 && x < size && z < size && openCell(id) && clearWalk(p, point(id), canWalk)) ids.push(id);
    }
    return ids;
  };
  const targets = new Set(connectors(goal)), starts = connectors(start);
  if (!targets.size || !starts.length) return [];
  const costs = new Float64Array(size * size).fill(Infinity), parent = new Int32Array(size * size).fill(-1);
  const heap: { id: number; cost: number; priority: number }[] = [];
  const push = (id: number, cost: number) => {
    const entry = { id, cost, priority: cost + distance(point(id), goal) };
    let i = heap.length; heap.push(entry);
    while (i > 0) { const p = (i - 1) >> 1; if (heap[p].priority <= entry.priority) break; heap[i] = heap[p]; i = p; }
    heap[i] = entry;
  };
  const pop = () => {
    const first = heap[0], last = heap.pop()!;
    if (heap.length) {
      let i = 0;
      while (i * 2 + 1 < heap.length) {
        let c = i * 2 + 1;
        if (c + 1 < heap.length && heap[c + 1].priority < heap[c].priority) c++;
        if (heap[c].priority >= last.priority) break;
        heap[i] = heap[c]; i = c;
      }
      heap[i] = last;
    }
    return first;
  };
  for (const id of starts) { costs[id] = distance(start, point(id)); push(id, costs[id]); }
  while (heap.length) {
    const current = pop(), id = current.id;
    if (current.cost !== costs[id]) continue;
    if (targets.has(id)) {
      const path: WalkPoint[] = [goal];
      for (let node = id; node !== -1; node = parent[node]) path.push(point(node));
      path.push(start); path.reverse();
      const result: WalkPoint[] = [];
      // Remove grid zigzags only when the whole shortcut is walkable.
      for (let i = 0; i < path.length - 1;) {
        let next = Math.min(i + 24, path.length - 1);
        while (next > i + 1 && !clearWalk(path[i], path[next], canWalk)) next--;
        result.push(path[next]); i = next;
      }
      return result;
    }
    const x = id % size, z = Math.floor(id / size);
    for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dz) continue;
      const nx = x + dx, nz = z + dz, next = nz * size + nx;
      if (nx < 0 || nz < 0 || nx >= size || nz >= size || !openCell(next)) continue;
      const cost = costs[id] + Math.hypot(dx, dz) * step;
      if (cost >= costs[next] || !clearWalk(point(id), point(next), canWalk)) continue;
      costs[next] = cost; parent[next] = id; push(next, cost);
    }
  }
  return [];
}

export function routeDistance(start: WalkPoint, route: WalkPoint[]) {
  return route.reduce((total, p, i) => total + distance(i ? route[i - 1] : start, p), 0);
}

// World north is -Z; positive yaw turns the camera left.
export function relativeBearing(start: WalkPoint, target: WalkPoint, yaw: number) {
  const angle = Math.atan2(target[0] - start[0], start[1] - target[1]) + yaw;
  return Math.atan2(Math.sin(angle), Math.cos(angle));
}

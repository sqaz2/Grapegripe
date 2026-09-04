// Coordinates are image pixels. Rendering, device size and camera never change physics.
const EPS = 1e-6;
const point = (v) => Array.isArray(v) ? { x: v[0], y: v[1] } : v;
const squareDistance = (a, b) => (a.x - b.x) ** 2 + (a.y - b.y) ** 2;
const cross = (a, b, c) => (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);

export function distanceToSegmentSquared(p, a, b) {
  const length = squareDistance(a, b);
  const t = length ? Math.max(0, Math.min(1, ((p.x - a.x) * (b.x - a.x) + (p.y - a.y) * (b.y - a.y)) / length)) : 0;
  return squareDistance(p, { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
}

function inside(p, ring) {
  let result = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[i], b = ring[j];
    if ((a.y > p.y) !== (b.y > p.y) && p.x < (b.x - a.x) * (p.y - a.y) / (b.y - a.y) + a.x) result = !result;
  }
  return result;
}

function segmentDistanceSquared(a, b, c, d) {
  const abC = cross(a, b, c), abD = cross(a, b, d);
  const cdA = cross(c, d, a), cdB = cross(c, d, b);
  const overlap = Math.max(Math.min(a.x, b.x), Math.min(c.x, d.x)) <= Math.min(Math.max(a.x, b.x), Math.max(c.x, d.x)) + EPS
    && Math.max(Math.min(a.y, b.y), Math.min(c.y, d.y)) <= Math.min(Math.max(a.y, b.y), Math.max(c.y, d.y)) + EPS;
  if (overlap && abC * abD <= EPS && cdA * cdB <= EPS) return 0;
  return Math.min(distanceToSegmentSquared(a, c, d), distanceToSegmentSquared(b, c, d), distanceToSegmentSquared(c, a, b), distanceToSegmentSquared(d, a, b));
}

class MinHeap {
  items = [];
  push(id, score) {
    const item = { id, score };
    let index = this.items.length;
    this.items.push(item);
    while (index > 0) {
      const parent = (index - 1) >> 1;
      if (this.items[parent].score <= score) break;
      this.items[index] = this.items[parent]; index = parent;
    }
    this.items[index] = item;
  }
  pop() {
    if (!this.items.length) return null;
    const result = this.items[0], last = this.items.pop();
    if (this.items.length) {
      let i = 0;
      while (i * 2 + 1 < this.items.length) {
        let child = i * 2 + 1;
        if (child + 1 < this.items.length && this.items[child + 1].score < this.items[child].score) child++;
        if (this.items[child].score >= last.score) break;
        this.items[i] = this.items[child]; i = child;
      }
      this.items[i] = last;
    }
    return result.id;
  }
}

export class Terrain {
  constructor(definition, cellSize = 12) {
    this.width = definition.width;
    this.height = definition.height;
    this.outer = definition.outer.map(point);
    this.holes = (definition.holes || []).map((ring) => ring.map(point));
    this.edges = [this.outer, ...this.holes].flatMap((ring) => ring.map((a, i) => ({ a, b: ring[(i + 1) % ring.length], radius: 0 })));
    this.gates = [];
    this.revision = 0;
    this.cellSize = cellSize;
    this.columns = Math.ceil(this.width / cellSize);
    this.rows = Math.ceil(this.height / cellSize);
    this.clearances = null;
    this.layers = new Map();
  }

  contains(p, radius = 0) {
    if (!Number.isFinite(p.x) || !Number.isFinite(p.y) || !inside(p, this.outer) || this.holes.some((hole) => inside(p, hole))) return false;
    for (const edge of this.edges) if (distanceToSegmentSquared(p, edge.a, edge.b) < (radius + EPS) ** 2) return false;
    for (const gate of this.gates) if (distanceToSegmentSquared(p, gate.a, gate.b) < (radius + gate.radius + EPS) ** 2) return false;
    return true;
  }

  segmentClear(a, b, radius = 0) {
    if (!this.contains(a, radius) || !this.contains(b, radius)) return false;
    for (const edge of this.edges) if (segmentDistanceSquared(a, b, edge.a, edge.b) <= (radius + EPS) ** 2) return false;
    for (const gate of this.gates) if (segmentDistanceSquared(a, b, gate.a, gate.b) <= (radius + gate.radius + EPS) ** 2) return false;
    return true;
  }

  // The entire motion is swept, including dashes and knockback. Projection is never
  // used here: a blocked actor must not teleport to the far side of a hole.
  move(start, dx, dy, radius) {
    if (!this.contains(start, radius)) return { ...start, moved: 0, blocked: true };
    const steps = Math.max(1, Math.ceil(Math.hypot(dx, dy) / 4));
    const sx = dx / steps, sy = dy / steps;
    let p = { x: start.x, y: start.y }, blocked = false;
    for (let i = 0; i < steps; i++) {
      const desired = { x: p.x + sx, y: p.y + sy };
      if (this.segmentClear(p, desired, radius)) { p = desired; continue; }
      blocked = true;
      const near = [...this.edges, ...this.gates]
        .map((edge) => ({ ...edge, distance: distanceToSegmentSquared(desired, edge.a, edge.b) }))
        .sort((a, b) => a.distance - b.distance).slice(0, 3);
      const candidates = near.map(({ a, b }) => {
        const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
        const tx = (b.x - a.x) / len, ty = (b.y - a.y) / len;
        const along = sx * tx + sy * ty;
        return { x: p.x + tx * along, y: p.y + ty * along };
      });
      candidates.push({ x: p.x + sx, y: p.y }, { x: p.x, y: p.y + sy });
      candidates.sort((a, b) => squareDistance(b, p) - squareDistance(a, p));
      const slide = candidates.find((candidate) => this.segmentClear(p, candidate, radius));
      if (slide) p = slide;
    }
    return { ...p, moved: Math.sqrt(squareDistance(start, p)), blocked };
  }

  // Horizontal spans correctly split around holes; a gate closes every branch.
  spansAt(y) {
    const xs = [];
    for (const { a, b } of this.edges) if ((a.y > y) !== (b.y > y)) xs.push(a.x + (y - a.y) * (b.x - a.x) / (b.y - a.y));
    xs.sort((a, b) => a - b);
    const spans = [];
    for (let i = 0; i < xs.length - 1; i++) {
      const x = (xs[i] + xs[i + 1]) / 2;
      if (inside({ x, y }, this.outer) && !this.holes.some((ring) => inside({ x, y }, ring))) spans.push([xs[i], xs[i + 1]]);
    }
    return spans;
  }

  setGates(segments = []) {
    this.gates = segments.map((segment) => ({ a: point(segment.a), b: point(segment.b), radius: segment.radius ?? 4 }));
    this.revision++;
    this.layers.clear();
  }

  nodePoint(id) {
    return { x: (id % this.columns + 0.5) * this.cellSize, y: (Math.floor(id / this.columns) + 0.5) * this.cellSize };
  }

  grid(radius) {
    if (this.layers.has(radius)) return this.layers.get(radius);
    const size = this.columns * this.rows;
    if (!this.clearances) {
      this.clearances = new Float32Array(size);
      for (let i = 0; i < size; i++) {
        const p = this.nodePoint(i);
        if (!inside(p, this.outer) || this.holes.some((hole) => inside(p, hole))) { this.clearances[i] = -1; continue; }
        this.clearances[i] = Math.min(...this.edges.map(({ a, b }) => distanceToSegmentSquared(p, a, b)));
      }
    }
    const grid = new Uint8Array(size);
    for (let i = 0; i < size; i++) {
      if (this.clearances[i] < (radius + EPS) ** 2) continue;
      const p = this.nodePoint(i);
      if (!this.gates.some((gate) => distanceToSegmentSquared(p, gate.a, gate.b) < (radius + gate.radius + EPS) ** 2)) grid[i] = 1;
    }
    this.layers.set(radius, grid);
    return grid;
  }

  nearestNode(p, radius, directFrom = null) {
    const grid = this.grid(radius);
    const candidates = [];
    for (let i = 0; i < grid.length; i++) if (grid[i]) candidates.push({ id: i, d: squareDistance(p, this.nodePoint(i)) });
    candidates.sort((a, b) => a.d - b.d);
    for (const candidate of candidates) {
      if (!directFrom || this.segmentClear(directFrom, this.nodePoint(candidate.id), radius)) return candidate.id;
    }
    return -1;
  }

  project(p, radius) {
    if (this.contains(p, radius)) return { x: p.x, y: p.y };
    const id = this.nearestNode(p, radius);
    return id < 0 ? null : this.nodePoint(id);
  }

  // A* with swept neighbor checks prevents diagonal corner cutting. Paths are
  // simplified only when the whole replacement segment remains on safe floor.
  findPath(start, target, radius) {
    if (!this.contains(start, radius)) return [];
    const goal = this.project(target, radius);
    if (!goal) return [];
    if (this.segmentClear(start, goal, radius)) return [goal];
    const first = this.nearestNode(start, radius, start);
    const last = this.nearestNode(goal, radius, goal);
    if (first < 0 || last < 0) return [];
    const grid = this.grid(radius);
    const costs = new Float64Array(grid.length).fill(Infinity);
    const parents = new Int32Array(grid.length).fill(-1);
    const closed = new Uint8Array(grid.length);
    const open = new MinHeap();
    costs[first] = 0; open.push(first, 0);
    let found = false;
    while (open.items.length) {
      const id = open.pop();
      if (closed[id]) continue;
      if (id === last) { found = true; break; }
      closed[id] = 1;
      const x = id % this.columns, y = Math.floor(id / this.columns), a = this.nodePoint(id);
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        if ((!dx && !dy) || x + dx < 0 || x + dx >= this.columns || y + dy < 0 || y + dy >= this.rows) continue;
        const next = id + dy * this.columns + dx;
        if (!grid[next] || closed[next]) continue;
        const cost = costs[id] + Math.hypot(dx, dy) * this.cellSize;
        if (cost >= costs[next]) continue;
        const b = this.nodePoint(next);
        if (!this.segmentClear(a, b, radius)) continue;
        costs[next] = cost; parents[next] = id;
        open.push(next, cost + Math.hypot(b.x - goal.x, b.y - goal.y));
      }
    }
    if (!found) return [];
    const raw = [goal];
    for (let id = last; id >= 0; id = parents[id]) raw.push(this.nodePoint(id));
    raw.push(start); raw.reverse();
    const path = [];
    for (let i = 0; i < raw.length - 1;) {
      let next = raw.length - 1;
      while (next > i + 1 && !this.segmentClear(raw[i], raw[next], radius)) next--;
      path.push(raw[next]); i = next;
    }
    return path;
  }
}

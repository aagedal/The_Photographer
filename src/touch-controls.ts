/** One captured thumb controls walking; other fingers can still look around. */
export class TouchWalk {
  pointerId: number | null = null;
  forward = 0;
  side = 0;
  offsetX = 0;
  offsetY = 0;

  begin(pointerId: number) {
    if (this.pointerId !== null) return false;
    this.pointerId = pointerId;
    return true;
  }

  move(pointerId: number, x: number, y: number, radius: number) {
    if (pointerId !== this.pointerId || radius <= 0) return;
    const distance = Math.hypot(x, y);
    const clamped = Math.min(distance, radius);
    const directionX = distance ? x / distance : 0;
    const directionY = distance ? y / distance : 0;
    this.offsetX = directionX * clamped;
    this.offsetY = directionY * clamped;
    // A quiet center prevents accidental movement; partial drags walk gently.
    const strength = Math.max(0, (clamped / radius - 0.16) / 0.84);
    this.side = directionX * strength || 0;
    this.forward = -directionY * strength || 0;
  }

  end(pointerId: number) {
    if (pointerId === this.pointerId) this.reset();
  }

  reset() {
    this.pointerId = null;
    this.forward = this.side = this.offsetX = this.offsetY = 0;
  }
}

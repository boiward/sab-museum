import { TILE_W, TILE_H } from './utils.js';

/**
 * Camera — smooth-following isometric camera.
 *
 * offsetX/offsetY represent where grid(0,0) maps to on screen.
 * Every gridToScreen() call uses these values as the origin offset.
 *
 * To follow the player, call follow() each frame; the camera lerps
 * toward the target. For instant jumps (zone transitions) use snapTo().
 */
export class Camera {
  constructor() {
    this.offsetX = 0;
    this.offsetY = 0;
    this._tx = 0;
    this._ty = 0;
  }

  /** Instantly place grid(gx,gy) at the screen center. No lerp. */
  snapTo(gx, gy, canvasW, canvasH) {
    const isoX = (gx - gy) * (TILE_W / 2);
    const isoY = (gx + gy) * (TILE_H / 2);
    this.offsetX = this._tx = Math.round(canvasW / 2 - isoX);
    this.offsetY = this._ty = Math.round((canvasH - 40) / 2 - isoY); // 40 = toolbar
  }

  /** Set the follow target; camera will lerp toward it. */
  follow(gx, gy, canvasW, canvasH) {
    const isoX = (gx - gy) * (TILE_W / 2);
    const isoY = (gx + gy) * (TILE_H / 2);
    this._tx = Math.round(canvasW / 2 - isoX);
    this._ty = Math.round((canvasH - 40) / 2 - isoY);
  }

  /** Call once per frame before drawing. dt in seconds. */
  update(dt) {
    const t = Math.min(10 * dt, 1);
    this.offsetX += (this._tx - this.offsetX) * t;
    this.offsetY += (this._ty - this.offsetY) * t;
  }

  /** Called on window resize — re-snap to avoid jarring jump. */
  onResize(gx, gy, canvasW, canvasH) {
    this.snapTo(gx, gy, canvasW, canvasH);
  }
}

import { gridToScreen, TILE_W, TILE_H } from './utils.js';
import { findPath } from './Pathfinder.js';

const MOVE_SPEED = 4; // tiles per second

/**
 * Character — player or NPC entity.
 *
 * IMPORTANT: sx/sy are stored in *world space* (camera offset = 0).
 * The Renderer adds camera.offsetX/Y at draw time, so the camera can
 * pan freely without needing to update every character's screen position.
 */
export class Character {
  constructor(id, gx, gy, color = '#ff6b6b') {
    this.id    = id;
    this.color = color;

    // Grid position (integer tile)
    this.gx = gx;
    this.gy = gy;

    // World-space screen position (for smooth interpolation, no camera offset)
    this.sx = 0;
    this.sy = 0;

    // Movement queue
    this.path   = [];
    this.moving = false;

    // Direction for eyes: 'se' | 'sw' | 'ne' | 'nw'
    this.facing = 'se';

    // Walk animation
    this.walkFrame = 0;
    this.walkTimer = 0;

    // Emoji reaction
    this.activeEmoji = null; // { glyph, age } o null
  }

  /** Dispara un emoji flotante sobre el personaje. */
  triggerEmoji(glyph) {
    this.activeEmoji = { glyph, age: 0 };
  }

  /** Snap world-space position to current grid tile (call after grid position change). */
  snapToGrid() {
    const pos = gridToScreen(this.gx, this.gy, 0, 0);
    this.sx   = pos.x;
    this.sy   = pos.y;
  }

  moveTo(targetX, targetY, map) {
    const path = findPath(map.grid, { x: this.gx, y: this.gy }, { x: targetX, y: targetY });
    if (path && path.length > 0) {
      this.path   = path;
      this.moving = true;
    }
  }

  /** offsetX/offsetY params kept for backward-compat but ignored — we use world space. */
  update(dt) {
    if (!this.moving || this.path.length === 0) {
      this.moving    = false;
      this.walkFrame = 0;
      return;
    }

    const next   = this.path[0];
    const target = gridToScreen(next.x, next.y, 0, 0); // world space

    // Update facing direction
    const dx = next.x - this.gx;
    const dy = next.y - this.gy;
    if      (dx > 0 && dy === 0) this.facing = 'se';
    else if (dx < 0 && dy === 0) this.facing = 'nw';
    else if (dy > 0 && dx === 0) this.facing = 'sw';
    else if (dy < 0 && dx === 0) this.facing = 'ne';

    const speed  = MOVE_SPEED * TILE_W; // pixels/second
    const moveX  = target.x - this.sx;
    const moveY  = target.y - this.sy;
    const dist   = Math.sqrt(moveX * moveX + moveY * moveY);

    if (dist < speed * dt) {
      this.sx = target.x;
      this.sy = target.y;
      this.gx = next.x;
      this.gy = next.y;
      this.path.shift();
      if (this.path.length === 0) this.moving = false;
    } else {
      this.sx += (moveX / dist) * speed * dt;
      this.sy += (moveY / dist) * speed * dt;
    }

    // Walk animation
    this.walkTimer += dt;
    if (this.walkTimer > 0.15) {
      this.walkTimer = 0;
      this.walkFrame = (this.walkFrame + 1) % 4;
    }

    // Emoji lifetime (2 segundos)
    if (this.activeEmoji) {
      this.activeEmoji.age += dt;
      if (this.activeEmoji.age >= 2.0) this.activeEmoji = null;
    }
  }
}

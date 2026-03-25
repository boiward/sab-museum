import { gridToScreen, TILE_W, TILE_H } from './utils.js';

// ── Tile colour palette ────────────────────────────────────────────────────
// top = upper diamond face, left/right = side depth faces.
// Add new tile types here; no other file needs changing.
const TILE_COLORS = {
  grass: {
    top:   '#2d5a1b',
    left:  '#1e3d12',
    right: '#162e0d',
  },
  flower: {
    top:   '#3a7a2a',
    left:  '#286b1a',
    right: '#1e5012',
  },
  path: {
    top:   '#8a7a6a',
    left:  '#6a5a4e',
    right: '#524538',
  },
  entrance: {
    top:   '#c8a830',
    left:  '#9a7e20',
    right: '#7a6018',
  },
  wall: {
    top:   '#7a6a5a',
    left:  '#5a4a3a',
    right: '#4a3a2a',
  },
  museumwall: {
    top:   '#cfc0a8',
    left:  '#9e9080',
    right: '#7a6e60',
  },
  water: {
    top:   '#2a5a8a',
    left:  '#1a3a6a',
    right: '#112850',
  },
  marble: {
    top:   '#d8d0c8',
    left:  '#a89880',
    right: '#887868',
  },
  carpet: {
    top:   '#6a1a3a',
    left:  '#4a1228',
    right: '#380e1e',
  },
};

const TILE_DEPTH = 8; // pixel height of the side depth faces

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx    = canvas.getContext('2d');
    this._time  = 0; // animation clock
  }

  // ── Frame lifecycle ────────────────────────────────────────────────────────

  resize() {
    this.canvas.width  = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  clear(bgColor = '#0d1f0d') {
    this.ctx.fillStyle = bgColor;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  tick(dt) { this._time += dt; }

  // ── Map ────────────────────────────────────────────────────────────────────

  drawMap(map, camera) {
    const ctx = this.ctx;
    for (let gy = 0; gy < map.rows; gy++) {
      for (let gx = 0; gx < map.cols; gx++) {
        const tile     = map.getTile(gx, gy);
        const { x, y } = gridToScreen(gx, gy, camera.offsetX, camera.offsetY);
        const colors   = TILE_COLORS[tile.type] ?? TILE_COLORS.grass;
        this._drawTile(ctx, x, y, colors);
      }
    }
  }

  _drawTile(ctx, cx, cy, colors) {
    const hw = TILE_W / 2;
    const hh = TILE_H / 2;
    const d  = TILE_DEPTH;

    // Top face (diamond)
    ctx.beginPath();
    ctx.moveTo(cx,      cy);
    ctx.lineTo(cx + hw, cy + hh);
    ctx.lineTo(cx,      cy + TILE_H);
    ctx.lineTo(cx - hw, cy + hh);
    ctx.closePath();
    ctx.fillStyle   = colors.top;
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.18)';
    ctx.lineWidth   = 0.5;
    ctx.stroke();

    // Left side face
    ctx.beginPath();
    ctx.moveTo(cx - hw, cy + hh);
    ctx.lineTo(cx,      cy + TILE_H);
    ctx.lineTo(cx,      cy + TILE_H + d);
    ctx.lineTo(cx - hw, cy + hh + d);
    ctx.closePath();
    ctx.fillStyle = colors.left;
    ctx.fill();

    // Right side face
    ctx.beginPath();
    ctx.moveTo(cx,      cy + TILE_H);
    ctx.lineTo(cx + hw, cy + hh);
    ctx.lineTo(cx + hw, cy + hh + d);
    ctx.lineTo(cx,      cy + TILE_H + d);
    ctx.closePath();
    ctx.fillStyle = colors.right;
    ctx.fill();
  }

  // ── Objects & Characters (depth-sorted together) ───────────────────────────

  /**
   * Draws all objects and characters in correct depth order.
   * objectManager, characters, and interactionSystem are passed per frame.
   */
  drawWorld(objectManager, characters, camera, interactionSystem) {
    // Merge objects + characters into one list, sort back-to-front
    const objs  = objectManager.allSorted();
    const chars = [...characters].sort((a, b) => (a.gx + a.gy) - (b.gx + b.gy));

    // Interleave by depth (gx + gy)
    let oi = 0, ci = 0;
    while (oi < objs.length || ci < chars.length) {
      const oDepth = oi < objs.length  ? (objs[oi].gx  + objs[oi].gy)  : Infinity;
      const cDepth = ci < chars.length ? (chars[ci].gx + chars[ci].gy) : Infinity;

      if (oDepth <= cDepth) {
        this._drawObject(objs[oi], camera, interactionSystem);
        oi++;
      } else {
        this._drawCharacter(chars[ci], camera);
        ci++;
      }
    }
  }

  // ── Click cursor ──────────────────────────────────────────────────────────

  drawCursor(targetX, targetY, alpha, camera) {
    const { x, y } = gridToScreen(targetX, targetY, camera.offsetX, camera.offsetY);
    const ctx = this.ctx;
    const cx  = x;
    const cy  = y + TILE_H / 2;
    const hw  = TILE_W / 2;
    const hh  = TILE_H / 2;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    ctx.moveTo(cx,      cy - hh);
    ctx.lineTo(cx + hw, cy);
    ctx.lineTo(cx,      cy + hh);
    ctx.lineTo(cx - hw, cy);
    ctx.closePath();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth   = 2;
    ctx.stroke();
    ctx.restore();
  }

  // ── Private: Object renderers ─────────────────────────────────────────────

  _drawObject(obj, camera, interactionSystem) {
    const { x, y } = gridToScreen(obj.gx, obj.gy, camera.offsetX, camera.offsetY);
    // Stand on the tile centre
    const sx = x;
    const sy = y + TILE_H / 2;

    const ctx = this.ctx;

    switch (obj.type) {
      case 'tree':    this._drawTree(ctx, sx, sy);           break;
      case 'bush':    this._drawBush(ctx, sx, sy);           break;
      case 'bench':   this._drawBench(ctx, sx, sy);          break;
      case 'lamp':    this._drawLamp(ctx, sx, sy);           break;
      case 'portal':  this._drawPortal(ctx, sx, sy);         break;
      case 'column':  this._drawColumn(ctx, sx, sy);         break;
      case 'stair':   this._drawStair(ctx, sx, sy);          break;
      case 'vase':    this._drawVase(ctx, sx, sy);           break;
      case 'painting':
        const highlighted = interactionSystem?.nearPainting === obj;
        this._drawPainting(ctx, sx, sy, obj, highlighted);
        break;
    }
  }

  _drawTree(ctx, sx, sy) {
    // Trunk
    ctx.fillStyle = '#5a3a1a';
    ctx.fillRect(sx - 4, sy - 28, 8, 26);

    // Dark shadow under canopy
    ctx.beginPath();
    ctx.ellipse(sx, sy - 20, 18, 8, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fill();

    // Lower canopy
    ctx.beginPath();
    ctx.ellipse(sx, sy - 30, 20, 16, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#2a5a18';
    ctx.fill();

    // Upper canopy highlight
    ctx.beginPath();
    ctx.ellipse(sx - 4, sy - 40, 14, 12, -0.3, 0, Math.PI * 2);
    ctx.fillStyle = '#3a8020';
    ctx.fill();

    // Top highlight
    ctx.beginPath();
    ctx.ellipse(sx - 4, sy - 46, 8, 7, -0.3, 0, Math.PI * 2);
    ctx.fillStyle = '#50aa2a';
    ctx.fill();
  }

  _drawBush(ctx, sx, sy) {
    ctx.beginPath();
    ctx.ellipse(sx, sy - 10, 14, 10, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#2a6a18';
    ctx.fill();

    ctx.beginPath();
    ctx.ellipse(sx - 6, sy - 14, 10, 8, -0.3, 0, Math.PI * 2);
    ctx.fillStyle = '#389020';
    ctx.fill();

    ctx.beginPath();
    ctx.ellipse(sx + 4, sy - 16, 8, 7, 0.2, 0, Math.PI * 2);
    ctx.fillStyle = '#44a828';
    ctx.fill();
  }

  _drawBench(ctx, sx, sy) {
    // Legs
    ctx.fillStyle = '#6a4020';
    ctx.fillRect(sx - 14, sy - 2, 4, 8);
    ctx.fillRect(sx + 10, sy - 2, 4, 8);

    // Back support
    ctx.fillStyle = '#8b5a28';
    ctx.fillRect(sx - 14, sy - 16, 4, 14);
    ctx.fillRect(sx + 10, sy - 16, 4, 14);

    // Seat slats
    ctx.fillStyle = '#a06030';
    ctx.fillRect(sx - 16, sy - 6, 32, 4);
    ctx.fillStyle = '#b87040';
    ctx.fillRect(sx - 16, sy - 10, 32, 3);

    // Back rest
    ctx.fillStyle = '#a06030';
    ctx.fillRect(sx - 14, sy - 20, 28, 4);
  }

  _drawLamp(ctx, sx, sy) {
    // Pole
    ctx.fillStyle = '#606878';
    ctx.fillRect(sx - 2, sy - 44, 4, 44);

    // Base plate
    ctx.fillStyle = '#484e58';
    ctx.fillRect(sx - 6, sy - 2, 12, 4);

    // Lamp arm
    ctx.fillStyle = '#606878';
    ctx.fillRect(sx, sy - 44, 10, 3);

    // Glow effect
    ctx.beginPath();
    ctx.arc(sx + 10, sy - 44, 14, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 230, 120, 0.15)';
    ctx.fill();

    // Lamp head
    ctx.beginPath();
    ctx.arc(sx + 10, sy - 44, 7, 0, Math.PI * 2);
    ctx.fillStyle = '#ffe880';
    ctx.fill();

    // Lamp housing
    ctx.beginPath();
    ctx.moveTo(sx + 2, sy - 38);
    ctx.lineTo(sx + 18, sy - 38);
    ctx.lineTo(sx + 20, sy - 44);
    ctx.lineTo(sx, sy - 44);
    ctx.closePath();
    ctx.fillStyle = '#484e58';
    ctx.fill();
  }

  _drawPortal(ctx, sx, sy) {
    const t    = this._time;
    const pulse = 0.5 + 0.5 * Math.sin(t * 2.5);
    const hw   = TILE_W / 2 * 0.75;
    const hh   = TILE_H / 2 * 0.75;

    ctx.save();

    // Glow fill
    ctx.beginPath();
    ctx.moveTo(sx,      sy - hh);
    ctx.lineTo(sx + hw, sy);
    ctx.lineTo(sx,      sy + hh);
    ctx.lineTo(sx - hw, sy);
    ctx.closePath();
    ctx.fillStyle = `rgba(80, 180, 255, ${0.15 + 0.15 * pulse})`;
    ctx.fill();

    // Animated border
    ctx.strokeStyle = `rgba(100, 200, 255, ${0.6 + 0.4 * pulse})`;
    ctx.lineWidth   = 2;
    ctx.stroke();

    // Floating particles
    for (let i = 0; i < 4; i++) {
      const angle  = t * 1.5 + (i * Math.PI / 2);
      const radius = 12 + 4 * Math.sin(t * 3 + i);
      const px     = sx + Math.cos(angle) * radius * 0.7;
      const py     = sy + Math.sin(angle) * radius * 0.35;
      ctx.beginPath();
      ctx.arc(px, py, 2, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(150, 220, 255, ${0.7 * pulse})`;
      ctx.fill();
    }

    ctx.restore();
  }

  _drawPainting(ctx, sx, sy, obj, highlighted) {
    const fw = 44; // frame outer width
    const fh = 36; // frame outer height
    const fy = sy - 50; // vertical position (above tile center)

    // Drop shadow
    ctx.save();
    ctx.shadowColor   = 'rgba(0,0,0,0.4)';
    ctx.shadowBlur    = 8;
    ctx.shadowOffsetX = 3;
    ctx.shadowOffsetY = 3;

    // Outer frame (gold)
    ctx.fillStyle = highlighted ? '#f0d060' : '#b8901e';
    ctx.fillRect(sx - fw / 2 - 3, fy - 3, fw + 6, fh + 6);

    ctx.restore();

    // Inner frame bevel
    ctx.fillStyle = '#8a6010';
    ctx.fillRect(sx - fw / 2 - 1, fy - 1, fw + 2, fh + 2);

    // Canvas surface
    ctx.fillStyle = '#f0ebe0';
    ctx.fillRect(sx - fw / 2, fy, fw, fh);

    // Try to draw the cached image
    const img = obj._cachedImage;
    if (img && img.complete && img.naturalWidth > 0) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(sx - fw / 2, fy, fw, fh);
      ctx.clip();
      ctx.drawImage(img, sx - fw / 2, fy, fw, fh);
      ctx.restore();
    } else {
      // Placeholder — decorative stripes suggesting a painting
      const stripeColors = ['#c8a060', '#a07840', '#806028', '#c8a060'];
      const sh = fh / stripeColors.length;
      stripeColors.forEach((color, i) => {
        ctx.fillStyle = color;
        ctx.fillRect(sx - fw / 2, fy + i * sh, fw, sh);
      });
      // "?" placeholder text
      ctx.fillStyle   = 'rgba(255,255,255,0.5)';
      ctx.font        = 'bold 16px monospace';
      ctx.textAlign   = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('?', sx, fy + fh / 2);
    }

    // Highlight ring when player is nearby
    if (highlighted) {
      ctx.strokeStyle = '#f0e060';
      ctx.lineWidth   = 2.5;
      ctx.strokeRect(sx - fw / 2 - 3, fy - 3, fw + 6, fh + 6);

      // Subtle pulsing glow
      const glow = 0.3 + 0.2 * Math.sin(this._time * 4);
      ctx.strokeStyle = `rgba(255, 240, 80, ${glow})`;
      ctx.lineWidth   = 5;
      ctx.strokeRect(sx - fw / 2 - 5, fy - 5, fw + 10, fh + 10);
    }

    // Small label number below frame
    if (obj.artworkId) {
      const num = obj.artworkId.replace(/\D/g, '');
      if (num) {
        ctx.fillStyle    = 'rgba(255,255,255,0.55)';
        ctx.font         = '9px monospace';
        ctx.textAlign    = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(`#${num}`, sx, fy + fh + 7);
      }
    }
  }

  _drawColumn(ctx, sx, sy) {
    // Base slab
    ctx.fillStyle = '#b0a898';
    ctx.fillRect(sx - 10, sy - 2, 20, 7);
    // Left depth face
    ctx.fillStyle = '#887870';
    ctx.fillRect(sx - 12, sy, 4, 5);
    // Right depth face
    ctx.fillStyle = '#988880';
    ctx.fillRect(sx + 8, sy, 4, 5);

    // Shaft
    ctx.fillStyle = '#d0c8c0';
    ctx.fillRect(sx - 7, sy - 46, 14, 44);
    // Shaft shadow (left)
    ctx.fillStyle = '#a09890';
    ctx.fillRect(sx - 7, sy - 46, 3, 44);
    // Shaft highlight (right)
    ctx.fillStyle = '#e0d8d0';
    ctx.fillRect(sx + 4, sy - 46, 3, 44);

    // Capital (decorative top)
    ctx.fillStyle = '#c8c0b8';
    ctx.fillRect(sx - 11, sy - 50, 22, 5);
    // Capital depth
    ctx.fillStyle = '#908880';
    ctx.fillRect(sx - 11, sy - 45, 22, 2);
    // Very top slab
    ctx.fillStyle = '#d8d0c8';
    ctx.fillRect(sx - 9, sy - 54, 18, 4);
  }

  _drawStair(ctx, sx, sy) {
    // Isometric staircase — 5 steps ascending to the back of the scene
    const numSteps = 5;
    const stepH    = 6;  // pixels each step rises
    const stepDepth = 4; // isometric depth of each step's face

    for (let i = 0; i < numSteps; i++) {
      const rise  = i * stepH;
      const inset = i * 4; // each higher step is narrower / retreated
      const w     = TILE_W * 0.85 - inset * 1.5;
      const topY  = sy - rise - stepDepth;
      const light = 160 + i * 8;

      // Top face of step
      ctx.fillStyle = `rgb(${light}, ${light - 6}, ${light - 14})`;
      ctx.beginPath();
      ctx.moveTo(sx,          topY - stepDepth);
      ctx.lineTo(sx + w / 2,  topY);
      ctx.lineTo(sx,          topY + stepDepth);
      ctx.lineTo(sx - w / 2,  topY);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.15)';
      ctx.lineWidth = 0.5;
      ctx.stroke();

      // Front face of step
      ctx.fillStyle = `rgb(${light - 30}, ${light - 36}, ${light - 44})`;
      ctx.beginPath();
      ctx.moveTo(sx - w / 2,  topY);
      ctx.lineTo(sx,          topY + stepDepth);
      ctx.lineTo(sx,          topY + stepDepth + stepH);
      ctx.lineTo(sx - w / 2,  topY + stepH);
      ctx.closePath();
      ctx.fill();

      // Right face of step
      ctx.fillStyle = `rgb(${light - 20}, ${light - 26}, ${light - 34})`;
      ctx.beginPath();
      ctx.moveTo(sx,          topY + stepDepth);
      ctx.lineTo(sx + w / 2,  topY);
      ctx.lineTo(sx + w / 2,  topY + stepH);
      ctx.lineTo(sx,          topY + stepDepth + stepH);
      ctx.closePath();
      ctx.fill();
    }
  }

  _drawVase(ctx, sx, sy) {
    // Pot base
    ctx.fillStyle = '#7a5a28';
    ctx.fillRect(sx - 7, sy - 4, 14, 5);

    // Vase body (ellipse approximated as rect with rounded feel)
    const grad = ctx.createLinearGradient(sx - 9, sy - 24, sx + 9, sy - 24);
    grad.addColorStop(0,   '#6a4a18');
    grad.addColorStop(0.3, '#a07830');
    grad.addColorStop(1,   '#7a5a20');
    ctx.beginPath();
    ctx.ellipse(sx, sy - 18, 9, 16, 0, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();

    // Vase rim
    ctx.beginPath();
    ctx.ellipse(sx, sy - 32, 6, 3, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#5a3a10';
    ctx.fill();

    // Plant / greenery
    ctx.fillStyle = '#1a5a10';
    ctx.beginPath();
    ctx.ellipse(sx - 6, sy - 38, 9, 5, -0.4, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#28821a';
    ctx.beginPath();
    ctx.ellipse(sx + 4, sy - 42, 8, 5, 0.4, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#3aaa22';
    ctx.beginPath();
    ctx.ellipse(sx - 1, sy - 46, 6, 4, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // ── Character dispatch ────────────────────────────────────────────────────

  _drawCharacter(char, camera) {
    const sx   = char.sx + camera.offsetX;
    const sy   = char.sy + camera.offsetY + TILE_H / 2;
    const bobY = char.moving ? Math.sin(char.walkFrame * Math.PI / 2) * 1.5 : 0;
    const ctx  = this.ctx;

    ctx.save();
    ctx.translate(sx, sy + bobY);

    if (char.characterStyle === 'edwdw') {
      this._drawEdwdw(ctx, char.facing, char.walkFrame, char.moving);
    } else if (char.characterStyle === 'sabibi') {
      this._drawSabibi(ctx, char.facing, char.walkFrame, char.moving);
    } else {
      this._drawGenericChar(ctx, char);
    }

    ctx.restore();
  }

  // ── Edwdw — detailed character ─────────────────────────────────────────────
  // Young man, dark brown long hair tied back, long gray coat, glasses.

  _drawEdwdw(ctx, facing, walkFrame, moving) {
    // se/sw = front view  |  ne/nw = back view
    // sw/nw = mirror of se/ne via scale(-1,1)
    const isFront = facing === 'se' || facing === 'sw';
    const flip    = (facing === 'sw' || facing === 'nw') ? -1 : 1;
    ctx.scale(flip, 1);
    if (isFront) this._edwdwFront(ctx, walkFrame, moving);
    else         this._edwdwBack(ctx, walkFrame, moving);
  }

  _edwdwFront(ctx, walkFrame, moving) {
    const swing = moving ? Math.sin(walkFrame * Math.PI / 2) : 0;

    // Shadow
    ctx.beginPath();
    ctx.ellipse(0, 5, 12, 5, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    ctx.fill();

    // ── Shoes ────────────────────────────────────────────────────────────
    ctx.fillStyle = '#18161e';
    ctx.beginPath(); ctx.ellipse(-4, 1, 6, 3, 0.2,  0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse( 4, 1, 6, 3, -0.2, 0, Math.PI * 2); ctx.fill();

    // ── Pants (barely visible below coat hem) ────────────────────────────
    ctx.fillStyle = '#28262e';
    ctx.fillRect(-6, -10, 4, 10);
    ctx.fillRect( 2, -10, 4, 10);

    // ── Coat — lower flare (wider at hem) ───────────────────────────────
    ctx.fillStyle = '#626270';
    ctx.beginPath();
    ctx.moveTo(-12,  -2);  // hem left
    ctx.lineTo( 12,  -2);  // hem right
    ctx.lineTo(  9, -11);  // waist right
    ctx.lineTo( -9, -11);  // waist left
    ctx.closePath();
    ctx.fill();

    // ── Coat — main body ────────────────────────────────────────────────
    ctx.fillStyle = '#5c5e6c'; // left panel (shadow side)
    ctx.fillRect(-9, -42, 9, 31);
    ctx.fillStyle = '#70727e'; // right panel (light side)
    ctx.fillRect( 0, -42, 9, 31);

    // Bottom hem accent
    ctx.fillStyle = '#4c4e5a';
    ctx.fillRect(-9, -13, 18, 2);

    // Center button line
    ctx.strokeStyle = '#3e404c';
    ctx.lineWidth = 0.6;
    ctx.beginPath(); ctx.moveTo(0, -11); ctx.lineTo(0, -40); ctx.stroke();

    // Buttons
    ctx.fillStyle = '#32343e';
    for (const by of [-16, -23, -30]) {
      ctx.beginPath(); ctx.arc(0, by, 1.3, 0, Math.PI * 2); ctx.fill();
    }

    // ── Coat — lapels ───────────────────────────────────────────────────
    ctx.fillStyle = '#505260';  // left lapel
    ctx.beginPath();
    ctx.moveTo(-9, -42); ctx.lineTo(-2, -35); ctx.lineTo(0, -40); ctx.lineTo(-4, -44);
    ctx.closePath(); ctx.fill();

    ctx.fillStyle = '#6c6e7c';  // right lapel (lighter)
    ctx.beginPath();
    ctx.moveTo(9, -42); ctx.lineTo(2, -35); ctx.lineTo(0, -40); ctx.lineTo(4, -44);
    ctx.closePath(); ctx.fill();

    // ── Left arm (swings with walk) ─────────────────────────────────────
    ctx.save();
    ctx.translate(-10, -37);
    ctx.fillStyle = '#5c5e6c';
    ctx.beginPath();
    ctx.moveTo(-4, 0); ctx.lineTo(0, 0);
    ctx.lineTo(1, 20 + swing * 3); ctx.lineTo(-3, 20 + swing * 3);
    ctx.closePath(); ctx.fill();
    ctx.beginPath();
    ctx.ellipse(-1, 23 + swing * 3, 3, 3.5, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#f4d4a6'; ctx.fill();
    ctx.restore();

    // ── Right arm (opposite phase) ───────────────────────────────────────
    ctx.save();
    ctx.translate(10, -37);
    ctx.fillStyle = '#70727e';
    ctx.beginPath();
    ctx.moveTo(0, 0); ctx.lineTo(4, 0);
    ctx.lineTo(3, 20 - swing * 3); ctx.lineTo(-1, 20 - swing * 3);
    ctx.closePath(); ctx.fill();
    ctx.beginPath();
    ctx.ellipse(1, 23 - swing * 3, 3, 3.5, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#f4d4a6'; ctx.fill();
    ctx.restore();

    // ── Coat collar ──────────────────────────────────────────────────────
    ctx.fillStyle = '#4a4c58';
    ctx.beginPath();
    ctx.moveTo(-5, -44); ctx.lineTo(5, -44); ctx.lineTo(6, -46); ctx.lineTo(-6, -46);
    ctx.closePath(); ctx.fill();

    // White shirt peek
    ctx.fillStyle = '#e6e6f0';
    ctx.beginPath();
    ctx.moveTo(-2, -43); ctx.lineTo(0, -47); ctx.lineTo(2, -43);
    ctx.closePath(); ctx.fill();

    // ── Neck ──────────────────────────────────────────────────────────────
    ctx.fillStyle = '#f4d4a6';
    ctx.fillRect(-3, -51, 6, 5);

    // ── Head ──────────────────────────────────────────────────────────────
    ctx.fillStyle = '#f4d4a6';
    ctx.beginPath();
    ctx.ellipse(1, -57, 7.5, 8.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#c9956e';
    ctx.lineWidth = 0.7;
    ctx.stroke();

    // ── Hair — dark brown, long pulled back ───────────────────────────────
    // Top mass
    ctx.fillStyle = '#2c1a08';
    ctx.beginPath(); ctx.ellipse(1, -63, 7.5, 5, 0, 0, Math.PI * 2); ctx.fill();

    // Left side strand (slightly longer)
    ctx.beginPath(); ctx.ellipse(-6, -58, 3, 7, -0.15, 0, Math.PI * 2); ctx.fill();

    // Right side (pulled back, shorter visible)
    ctx.fillStyle = '#3a2210';
    ctx.beginPath(); ctx.ellipse(7.5, -58, 2, 5.5, 0.2, 0, Math.PI * 2); ctx.fill();

    // Part / highlight strand
    ctx.strokeStyle = '#4e3018';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(-1, -66); ctx.bezierCurveTo(0, -64, 2, -62, 4, -61); ctx.stroke();

    // Bun top-back (bulge visible from front)
    ctx.fillStyle = '#2c1a08';
    ctx.beginPath(); ctx.ellipse(2, -67, 5, 3.5, 0.2, 0, Math.PI * 2); ctx.fill();
    // Hair tie
    ctx.fillStyle = '#0c0808';
    ctx.beginPath(); ctx.arc(2, -67, 2, 0, Math.PI * 2); ctx.fill();

    // ── Glasses ───────────────────────────────────────────────────────────
    const [gx, gy] = [1, -54];
    ctx.strokeStyle = '#26202e';
    ctx.lineWidth   = 1.3;
    ctx.lineJoin    = 'round';
    ctx.strokeRect(gx - 8.5, gy - 2.5, 6,   4);   // left lens
    ctx.strokeRect(gx + 2.5, gy - 2.5, 6,   4);   // right lens
    ctx.beginPath(); ctx.moveTo(gx - 2.5, gy - 0.5); ctx.lineTo(gx + 2.5, gy - 0.5); ctx.stroke(); // bridge
    ctx.beginPath(); ctx.moveTo(gx - 8.5, gy - 0.5); ctx.lineTo(gx - 11,  gy + 1);   ctx.stroke(); // left temple
    ctx.beginPath(); ctx.moveTo(gx + 8.5, gy - 0.5); ctx.lineTo(gx + 11,  gy + 1);   ctx.stroke(); // right temple

    // Eyes through lenses
    ctx.fillStyle = '#18100c';
    ctx.beginPath(); ctx.arc(gx - 5.5, gy - 0.5, 1.3, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(gx + 5.5, gy - 0.5, 1.3, 0, Math.PI * 2); ctx.fill();

    // Lens glint
    ctx.fillStyle = 'rgba(255,255,255,0.32)';
    ctx.beginPath(); ctx.arc(gx - 7,   gy - 1.5, 1,   0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(gx + 3.8, gy - 1.5, 0.9, 0, Math.PI * 2); ctx.fill();
  }

  _edwdwBack(ctx, walkFrame, moving) {
    const swing = moving ? Math.sin(walkFrame * Math.PI / 2) : 0;

    // Shadow
    ctx.beginPath();
    ctx.ellipse(0, 5, 12, 5, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    ctx.fill();

    // ── Shoes ────────────────────────────────────────────────────────────
    ctx.fillStyle = '#18161e';
    ctx.beginPath(); ctx.ellipse(-4, 1, 6, 3, 0.2,  0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse( 4, 1, 6, 3, -0.2, 0, Math.PI * 2); ctx.fill();

    // ── Pants ────────────────────────────────────────────────────────────
    ctx.fillStyle = '#28262e';
    ctx.fillRect(-6, -10, 4, 10);
    ctx.fillRect( 2, -10, 4, 10);

    // ── Coat flare ────────────────────────────────────────────────────────
    ctx.fillStyle = '#585a68';
    ctx.beginPath();
    ctx.moveTo(-12, -2); ctx.lineTo(12, -2); ctx.lineTo(9, -11); ctx.lineTo(-9, -11);
    ctx.closePath(); ctx.fill();

    // ── Coat back ─────────────────────────────────────────────────────────
    ctx.fillStyle = '#66687a';
    ctx.fillRect(-9, -42, 18, 31);

    // Edge shading — left shadow, right highlight
    ctx.fillStyle = '#4e5060';
    ctx.fillRect(-9, -42, 2, 31);
    ctx.fillStyle = '#78788a';
    ctx.fillRect( 7, -42, 2, 31);

    // Back center seam
    ctx.strokeStyle = '#535564';
    ctx.lineWidth = 0.7;
    ctx.beginPath(); ctx.moveTo(0, -11); ctx.lineTo(0, -42); ctx.stroke();

    // ── Left arm ─────────────────────────────────────────────────────────
    ctx.save();
    ctx.translate(-10, -37);
    ctx.fillStyle = '#58596a';
    ctx.beginPath();
    ctx.moveTo(-4, 0); ctx.lineTo(0, 0);
    ctx.lineTo(1, 20 - swing * 3); ctx.lineTo(-3, 20 - swing * 3);
    ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.ellipse(-1, 23 - swing * 3, 3, 3.5, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#f4d4a6'; ctx.fill();
    ctx.restore();

    // ── Right arm ─────────────────────────────────────────────────────────
    ctx.save();
    ctx.translate(10, -37);
    ctx.fillStyle = '#6e7080';
    ctx.beginPath();
    ctx.moveTo(0, 0); ctx.lineTo(4, 0);
    ctx.lineTo(3, 20 + swing * 3); ctx.lineTo(-1, 20 + swing * 3);
    ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.ellipse(1, 23 + swing * 3, 3, 3.5, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#f4d4a6'; ctx.fill();
    ctx.restore();

    // ── Back collar ───────────────────────────────────────────────────────
    ctx.fillStyle = '#484a56';
    ctx.fillRect(-5, -42, 10, 3);

    // ── Neck ──────────────────────────────────────────────────────────────
    ctx.fillStyle = '#f4d4a6';
    ctx.fillRect(-2, -48, 4, 6);

    // ── Head — back view (all dark hair) ──────────────────────────────────
    ctx.fillStyle = '#2c1a08';
    ctx.beginPath();
    ctx.ellipse(0, -55, 8.5, 9.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Skin peeking at chin/lower head
    ctx.fillStyle = '#f4d4a6';
    ctx.beginPath();
    ctx.ellipse(0, -49, 6, 4.5, 0, Math.PI, Math.PI * 2);
    ctx.fill();

    // ── Ponytail — this is the star of the back view ─────────────────────
    // Base bun at crown
    ctx.fillStyle = '#341e0c';
    ctx.beginPath(); ctx.ellipse(0, -64, 6.5, 5, 0, 0, Math.PI * 2); ctx.fill();

    // Hair tie elastic band
    ctx.fillStyle = '#0c0808';
    ctx.fillRect(-4.5, -66, 9, 2.5);
    ctx.beginPath(); ctx.arc(0, -65, 2.5, 0, Math.PI * 2); ctx.fill();

    // Ponytail body (flowing curve downward)
    ctx.fillStyle = '#3c2210';
    ctx.beginPath();
    ctx.moveTo(-5.5, -64);
    ctx.bezierCurveTo(-8, -55, -7, -46, -4, -41);
    ctx.bezierCurveTo(-2, -38, 2, -38, 4, -41);
    ctx.bezierCurveTo( 7, -46,  8, -55,  5.5, -64);
    ctx.closePath();
    ctx.fill();

    // Strand highlights / hair texture
    ctx.strokeStyle = '#5c3820';
    ctx.lineWidth = 0.9;
    for (const xOff of [-2, 0, 2]) {
      ctx.beginPath();
      ctx.moveTo(xOff, -63);
      ctx.bezierCurveTo(xOff - 1, -54, xOff - 0.5, -46, xOff * 0.6, -42);
      ctx.stroke();
    }

    // Ponytail tip (tapers)
    ctx.fillStyle = '#2a1608';
    ctx.beginPath(); ctx.ellipse(0, -41, 3.5, 2.5, 0, 0, Math.PI * 2); ctx.fill();

    // Shine on hair (ambient occlusion style)
    ctx.strokeStyle = '#5c3820';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(-5, -63); ctx.bezierCurveTo(-3, -61, 0, -60, 2, -60); ctx.stroke();
  }

  // ── Sabibi — detailed character ───────────────────────────────────────────
  // Young woman, shorter than Edwdw, blue-black loose hair, white aesthetic coat, round glasses.

  _drawSabibi(ctx, facing, walkFrame, moving) {
    const isFront = facing === 'se' || facing === 'sw';
    const flip    = (facing === 'sw' || facing === 'nw') ? -1 : 1;
    ctx.scale(flip, 1);
    if (isFront) this._sabibiFornt(ctx, walkFrame, moving);
    else         this._sabibiBack(ctx, walkFrame, moving);
  }

  _sabibiFornt(ctx, walkFrame, moving) {
    const swing = moving ? Math.sin(walkFrame * Math.PI / 2) : 0;

    // Shadow
    ctx.beginPath();
    ctx.ellipse(0, 5, 10, 4, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fill();

    // ── Shoes — white Mary Jane style ────────────────────────────────────
    ctx.fillStyle = '#e8e0f8';
    ctx.beginPath(); ctx.ellipse(-3, 2, 5, 2.5,  0.15, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse( 3, 2, 5, 2.5, -0.15, 0, Math.PI * 2); ctx.fill();
    // Straps
    ctx.fillStyle = '#c4b8e4';
    ctx.fillRect(-6.5, -0.5, 4, 1.5);
    ctx.fillRect( 2.5, -0.5, 4, 1.5);

    // ── Legs (white tights) ───────────────────────────────────────────────
    ctx.fillStyle = '#eae6f4';
    ctx.fillRect(-5, -8, 3, 9);
    ctx.fillRect( 2, -8, 3, 9);

    // ── Coat — lower flare (oversized, wider) ────────────────────────────
    ctx.fillStyle = '#ece8fa';
    ctx.beginPath();
    ctx.moveTo(-11, -1); ctx.lineTo(11, -1); ctx.lineTo(8, -10); ctx.lineTo(-8, -10);
    ctx.closePath(); ctx.fill();

    // ── Coat — main body ──────────────────────────────────────────────────
    ctx.fillStyle = '#eeeaf8'; // left panel
    ctx.fillRect(-8, -36, 8, 26);
    ctx.fillStyle = '#faf8ff'; // right panel (brighter)
    ctx.fillRect( 0, -36, 8, 26);

    // Hem accent
    ctx.fillStyle = '#d4d0ee';
    ctx.fillRect(-8, -12, 16, 1.5);

    // Center seam
    ctx.strokeStyle = '#c8c4e2';
    ctx.lineWidth = 0.5;
    ctx.beginPath(); ctx.moveTo(0, -10); ctx.lineTo(0, -34); ctx.stroke();

    // Button
    ctx.fillStyle = '#b0acd0';
    ctx.beginPath(); ctx.arc(0, -20, 1.1, 0, Math.PI * 2); ctx.fill();

    // ── Coat — lapels (minimal / clean) ──────────────────────────────────
    ctx.fillStyle = '#d8d4f0';
    ctx.beginPath();
    ctx.moveTo(-8, -36); ctx.lineTo(-2, -30); ctx.lineTo(0, -34); ctx.lineTo(-3, -38);
    ctx.closePath(); ctx.fill();

    ctx.fillStyle = '#eeecfc';
    ctx.beginPath();
    ctx.moveTo(8, -36); ctx.lineTo(2, -30); ctx.lineTo(0, -34); ctx.lineTo(3, -38);
    ctx.closePath(); ctx.fill();

    // ── Left arm ──────────────────────────────────────────────────────────
    ctx.save();
    ctx.translate(-9, -30);
    ctx.fillStyle = '#eae6f8';
    ctx.beginPath();
    ctx.moveTo(-3.5, 0); ctx.lineTo(0, 0);
    ctx.lineTo(0.5, 18 + swing * 2.5); ctx.lineTo(-3, 18 + swing * 2.5);
    ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.ellipse(-1, 21 + swing * 2.5, 2.8, 3, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#f8d0aa'; ctx.fill();
    ctx.restore();

    // ── Right arm ─────────────────────────────────────────────────────────
    ctx.save();
    ctx.translate(9, -30);
    ctx.fillStyle = '#faf8ff';
    ctx.beginPath();
    ctx.moveTo(0, 0); ctx.lineTo(3.5, 0);
    ctx.lineTo(2.5, 18 - swing * 2.5); ctx.lineTo(-0.5, 18 - swing * 2.5);
    ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.ellipse(1, 21 - swing * 2.5, 2.8, 3, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#f8d0aa'; ctx.fill();
    ctx.restore();

    // ── Collar ────────────────────────────────────────────────────────────
    ctx.fillStyle = '#ccc8e8';
    ctx.beginPath();
    ctx.moveTo(-4, -36); ctx.lineTo(4, -36); ctx.lineTo(5, -38); ctx.lineTo(-5, -38);
    ctx.closePath(); ctx.fill();

    // ── Neck ──────────────────────────────────────────────────────────────
    ctx.fillStyle = '#f8d0aa';
    ctx.fillRect(-2.5, -42, 5, 4);

    // ── Head ──────────────────────────────────────────────────────────────
    ctx.fillStyle = '#f8d0aa';
    ctx.beginPath();
    ctx.ellipse(0, -48, 7, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#c48860';
    ctx.lineWidth = 0.6;
    ctx.stroke();

    // ── Hair — blue-black, loose on both sides ────────────────────────────
    // Top mass
    ctx.fillStyle = '#0c0a1a';
    ctx.beginPath(); ctx.ellipse(0, -54, 7.5, 4.5, 0, 0, Math.PI * 2); ctx.fill();

    // Left flowing side
    ctx.fillStyle = '#0a0818';
    ctx.beginPath();
    ctx.moveTo(-7, -56);
    ctx.bezierCurveTo(-10, -52, -11, -44, -10, -38);
    ctx.bezierCurveTo( -9, -33,  -6, -32,  -5, -34);
    ctx.bezierCurveTo( -5, -40,  -6, -48,  -5, -54);
    ctx.closePath(); ctx.fill();

    // Right flowing side
    ctx.beginPath();
    ctx.moveTo(7, -56);
    ctx.bezierCurveTo(10, -52, 11, -44, 10, -38);
    ctx.bezierCurveTo( 9, -33,  6, -32,  5, -34);
    ctx.bezierCurveTo( 5, -40,  6, -48,  5, -54);
    ctx.closePath(); ctx.fill();

    // Hair highlights (blue-violet tint)
    ctx.strokeStyle = '#201838';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(-6, -54); ctx.bezierCurveTo(-8, -48, -8, -42, -7, -38); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo( 6, -54); ctx.bezierCurveTo( 8, -48,  8, -42,  7, -38); ctx.stroke();

    // ── Glasses — round golden wire ───────────────────────────────────────
    const gx = 0, gy = -46;
    ctx.strokeStyle = '#c0a868';
    ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.ellipse(gx - 5.5, gy - 0.5, 3.5, 3, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(gx + 5.5, gy - 0.5, 3.5, 3, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(gx - 2, gy - 0.5); ctx.lineTo(gx + 2, gy - 0.5); ctx.stroke(); // bridge
    ctx.lineWidth = 0.9;
    ctx.beginPath(); ctx.moveTo(gx - 9, gy - 0.5); ctx.lineTo(gx - 11, gy + 0.5); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(gx + 9, gy - 0.5); ctx.lineTo(gx + 11, gy + 0.5); ctx.stroke();

    // Eyes
    ctx.fillStyle = '#180e0a';
    ctx.beginPath(); ctx.arc(gx - 5.5, gy - 0.5, 1.2, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(gx + 5.5, gy - 0.5, 1.2, 0, Math.PI * 2); ctx.fill();

    // Lens glint
    ctx.fillStyle = 'rgba(255,255,255,0.30)';
    ctx.beginPath(); ctx.arc(gx - 7.2, gy - 1.5, 0.9, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(gx + 3.8, gy - 1.5, 0.8, 0, Math.PI * 2); ctx.fill();
  }

  _sabibiBack(ctx, walkFrame, moving) {
    const swing = moving ? Math.sin(walkFrame * Math.PI / 2) : 0;

    // Shadow
    ctx.beginPath();
    ctx.ellipse(0, 5, 10, 4, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fill();

    // ── Shoes ────────────────────────────────────────────────────────────
    ctx.fillStyle = '#e8e0f8';
    ctx.beginPath(); ctx.ellipse(-3, 2, 5, 2.5,  0.15, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse( 3, 2, 5, 2.5, -0.15, 0, Math.PI * 2); ctx.fill();

    // ── Legs ──────────────────────────────────────────────────────────────
    ctx.fillStyle = '#eae6f4';
    ctx.fillRect(-5, -8, 3, 9);
    ctx.fillRect( 2, -8, 3, 9);

    // ── Coat lower flare ─────────────────────────────────────────────────
    ctx.fillStyle = '#eae6f6';
    ctx.beginPath();
    ctx.moveTo(-11, -1); ctx.lineTo(11, -1); ctx.lineTo(8, -10); ctx.lineTo(-8, -10);
    ctx.closePath(); ctx.fill();

    // ── Coat back ─────────────────────────────────────────────────────────
    ctx.fillStyle = '#eeeaf8';
    ctx.fillRect(-8, -36, 16, 26);

    // Edge shading
    ctx.fillStyle = '#d8d4f0';
    ctx.fillRect(-8, -36, 1.5, 26);
    ctx.fillStyle = '#fefcff';
    ctx.fillRect( 6.5, -36, 1.5, 26);

    // Back seam
    ctx.strokeStyle = '#cac6e2';
    ctx.lineWidth = 0.5;
    ctx.beginPath(); ctx.moveTo(0, -10); ctx.lineTo(0, -36); ctx.stroke();

    // ── Left arm ──────────────────────────────────────────────────────────
    ctx.save();
    ctx.translate(-9, -30);
    ctx.fillStyle = '#eae6f8';
    ctx.beginPath();
    ctx.moveTo(-3.5, 0); ctx.lineTo(0, 0);
    ctx.lineTo(0.5, 18 - swing * 2.5); ctx.lineTo(-3, 18 - swing * 2.5);
    ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.ellipse(-1, 21 - swing * 2.5, 2.8, 3, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#f8d0aa'; ctx.fill();
    ctx.restore();

    // ── Right arm ─────────────────────────────────────────────────────────
    ctx.save();
    ctx.translate(9, -30);
    ctx.fillStyle = '#faf8ff';
    ctx.beginPath();
    ctx.moveTo(0, 0); ctx.lineTo(3.5, 0);
    ctx.lineTo(2.5, 18 + swing * 2.5); ctx.lineTo(-0.5, 18 + swing * 2.5);
    ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.ellipse(1, 21 + swing * 2.5, 2.8, 3, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#f8d0aa'; ctx.fill();
    ctx.restore();

    // ── Back collar ───────────────────────────────────────────────────────
    ctx.fillStyle = '#c8c4e0';
    ctx.fillRect(-4, -36, 8, 2.5);

    // ── Neck ──────────────────────────────────────────────────────────────
    ctx.fillStyle = '#f8d0aa';
    ctx.fillRect(-2, -42, 4, 6);

    // ── Head back (mostly hair) ───────────────────────────────────────────
    ctx.fillStyle = '#0c0a1a';
    ctx.beginPath();
    ctx.ellipse(0, -48, 7.5, 8.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Skin at chin/nape
    ctx.fillStyle = '#f8d0aa';
    ctx.beginPath();
    ctx.ellipse(0, -42, 5.5, 4, 0, Math.PI, Math.PI * 2);
    ctx.fill();

    // ── Loose flowing hair — wide back view ──────────────────────────────
    ctx.fillStyle = '#0a0818';

    // Left side wide flow
    ctx.beginPath();
    ctx.moveTo(-7.5, -54);
    ctx.bezierCurveTo(-12, -48, -13, -38, -11, -28);
    ctx.bezierCurveTo( -9, -22,  -5, -21,  -4, -24);
    ctx.bezierCurveTo( -4, -32,  -5, -44,  -4, -52);
    ctx.closePath(); ctx.fill();

    // Right side wide flow
    ctx.beginPath();
    ctx.moveTo(7.5, -54);
    ctx.bezierCurveTo(12, -48, 13, -38, 11, -28);
    ctx.bezierCurveTo( 9, -22,  5, -21,  4, -24);
    ctx.bezierCurveTo( 4, -32,  5, -44,  4, -52);
    ctx.closePath(); ctx.fill();

    // Center hair mass
    ctx.fillStyle = '#0e0c20';
    ctx.beginPath();
    ctx.moveTo(-4, -54);
    ctx.bezierCurveTo(-5, -44, -5, -34, -4, -24);
    ctx.lineTo(4, -24);
    ctx.bezierCurveTo(5, -34, 5, -44, 4, -54);
    ctx.closePath(); ctx.fill();

    // Blue-violet highlights
    ctx.strokeStyle = '#201838';
    ctx.lineWidth = 1;
    for (const xOff of [-8, -4, 0, 4, 8]) {
      ctx.beginPath();
      ctx.moveTo(xOff * 0.8, -52);
      ctx.bezierCurveTo(xOff * 0.9 - 0.5, -42, xOff * 0.9, -34, xOff * 0.8, -26);
      ctx.stroke();
    }

    // Hair tips
    ctx.fillStyle = '#08061a';
    ctx.beginPath(); ctx.moveTo(-11, -28); ctx.bezierCurveTo(-10, -24, -7, -23, -4, -24); ctx.fill();
    ctx.beginPath(); ctx.moveTo(11, -28); ctx.bezierCurveTo(10, -24, 7, -23, 4, -24); ctx.fill();

    // Top sheen
    ctx.strokeStyle = '#281e42';
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.moveTo(-5, -54); ctx.bezierCurveTo(-2, -53, 1, -52, 4, -53); ctx.stroke();
  }

  // ── Generic character (fallback for NPCs) ────────────────────────────────

  _drawGenericChar(ctx, char) {
    ctx.beginPath();
    ctx.ellipse(0, 8, 10, 5, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    ctx.fill();

    ctx.beginPath();
    ctx.ellipse(0, -8, 8, 10, 0, 0, Math.PI * 2);
    ctx.fillStyle   = char.color;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(0, -22, 7, 0, Math.PI * 2);
    ctx.fillStyle = '#ffe0bd';
    ctx.fill();
  }

  /** Render a character preview into a small canvas element. */
  drawCharacterPreview(canvas, style) {
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height * 0.72);
    if (style === 'edwdw') {
      this._drawEdwdw(ctx, 'se', 0, false);
    } else if (style === 'sabibi') {
      this._drawSabibi(ctx, 'se', 0, false);
    }
    ctx.restore();
  }

  _darken(hex) {
    const n = parseInt(hex.slice(1), 16);
    const r = Math.max(0, ((n >> 16) & 255) - 40);
    const g = Math.max(0, ((n >> 8)  & 255) - 40);
    const b = Math.max(0, ( n        & 255) - 40);
    return `rgb(${r},${g},${b})`;
  }
}
